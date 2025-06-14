import { type ParseArgsConfig, parseArgs } from 'node:util';
import Configstore from 'configstore';
import debug from 'debug';
import { type AlephClient, alephClient } from './aleph/client.mjs';
import {
    convertEntity,
    getDatasetUrls,
    getDeltaUrls,
    streamDelta,
    streamEntities,
} from './opensanctions/utils.mjs';
import {
    createCollection,
    findCollectionId,
    loadEntities,
    removeEntities,
} from './aleph/utils.mjs';
import type { IFlatEntityDatum } from './opensanctions/types.mjs';

import 'dotenv/config';

const dbg = debug('opensanctions-to-aleph');
const store = new Configstore('import-opensanctions');

async function runFullImport(
    client: AlephClient,
    collection_id: number,
    mainUrl: string
): Promise<void> {
    let entities: IFlatEntityDatum[] = [];
    for await (const entity of streamEntities(mainUrl)) {
        entities.push(entity);
        if (entities.length >= 5000) {
            dbg('Loading %d entities...', entities.length);
            await loadEntities(client, collection_id, entities);
            entities = [];
        }
    }

    if (entities.length > 0) {
        dbg('Loading final %d entities...', entities.length);
        await loadEntities(client, collection_id, entities);
    }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
async function doDeltaImport(
    client: AlephClient,
    collection_id: number,
    foreignId: string,
    url: string,
    skipRemovals: boolean
): Promise<void> {
    let removals: string[] = [];
    let entities: IFlatEntityDatum[] = [];

    for await (const operation of streamDelta(url)) {
        if (operation.op === 'DEL') {
            if (!skipRemovals) {
                removals.push(operation.entity.id);
            }
        } else {
            entities.push(convertEntity(operation.entity));
        }

        if (entities.length >= 1000 || removals.length >= 1000) {
            if (removals.length > 0) {
                dbg('Removing %d entities...', removals.length);
                await removeEntities(client, foreignId, removals);
                removals = [];
            }

            if (entities.length > 0) {
                dbg('Loading %d entities...', entities.length);
                await loadEntities(client, collection_id, entities);
                entities = [];
            }
        }
    }

    if (removals.length > 0) {
        dbg('Removing %d entities...', removals.length);
        await removeEntities(client, foreignId, removals);
    }

    if (entities.length > 0) {
        dbg('Loading %d entities...', entities.length);
        await loadEntities(client, collection_id, entities);
    }
}

async function runDeltaImport(
    client: AlephClient,
    collection_id: number,
    foreignId: string,
    deltaUrls: Record<string, string>,
    skipRemovals: boolean
): Promise<void> {
    for (const [version, url] of Object.entries(deltaUrls)) {
        dbg('Loading delta %s from %s...', version, url);
        // eslint-disable-next-line no-await-in-loop
        await doDeltaImport(client, collection_id, foreignId, url, skipRemovals);
    }
}

async function main(): Promise<void> {
    const config: ParseArgsConfig = {
        allowNegative: true,
        allowPositionals: true,
        options: {
            host: {
                type: 'string',
                short: 'h',
            },
            key: {
                type: 'string',
                short: 'k',
            },
            debug: {
                type: 'boolean',
                short: 'd',
                default: false,
            },
            'full-import': {
                type: 'boolean',
                short: 'f',
                default: false,
            },
            'skip-removals': {
                type: 'boolean',
                short: 's',
                default: false,
            },
        },
    } as const;

    const { values, positionals } = parseArgs(config);
    if (positionals.length === 0 || positionals.length > 2) {
        throw new Error(
            'Syntax: import-opensanctions [--host|-h aleph-host] [--key|-k api-key] <dataset> [foreign-id]'
        );
    }

    const dataset = positionals[0]!;
    const foreignId = positionals[1] ?? dataset;

    const host = (process.env['ALEPHCLIENT_HOST'] ?? values['host']) as string | undefined;
    const key = (process.env['ALEPHCLIENT_API_KEY'] ?? values['key']) as string | undefined;
    const fullImport = !!values['full-import'];
    const skipRemovals = !!values['skip-removals'];

    if (values['debug']) {
        dbg.enabled = true;
    }

    if (!host) {
        throw new Error('Missing host');
    }

    if (!key) {
        throw new Error('Missing key');
    }

    const client = alephClient(host, key);

    let collection_id = await findCollectionId(client, foreignId);
    if (collection_id) {
        dbg('Collection ID for %s is %d', foreignId, collection_id);
    } else {
        collection_id = await createCollection(client, foreignId);
        dbg('Created collection %d for %s', collection_id, foreignId);
    }

    const [mainUrl, deltaUrl, version] = await getDatasetUrls(dataset);
    const lastVersion = store.get(`${dataset}.version`) as string | undefined;
    dbg(
        'Main URL: %s; delta URL: %s; dataset version: %s; last processed version: %s',
        mainUrl,
        deltaUrl,
        version,
        lastVersion
    );

    if (version === lastVersion && !fullImport) {
        process.stderr.write(`Dataset "${dataset}" is already up to date\n`);
        return;
    }

    const deltaUrls =
        deltaUrl && lastVersion && !fullImport ? await getDeltaUrls(deltaUrl, lastVersion) : null;
    dbg('Delta URLs: %o', deltaUrls);

    if (!mainUrl && !deltaUrls) {
        throw new Error(`No URLs found for "${dataset}"\n`);
    }

    if (deltaUrls) {
        await runDeltaImport(client, collection_id, foreignId, deltaUrls, skipRemovals);
    } else if (mainUrl) {
        await runFullImport(client, collection_id, mainUrl);
    }

    store.set(`${dataset}.version`, version);
}

main().catch((err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err));
    process.stderr.write(`Error: ${e.message}\n`);
    process.exitCode = 1;
});
