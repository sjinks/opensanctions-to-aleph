import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import type {
    DatasetMetadata,
    DeltaIndex,
    DeltaOperation,
    Entity,
    IFlatEntityDatum,
} from './types.mjs';

export async function getDatasetUrls(
    dataset: string
): Promise<[string | undefined, string | undefined, string]> {
    const response = await fetch(
        `https://data.opensanctions.org/datasets/latest/${dataset}/index.json`
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch metadata for dataset "${dataset}": ${response.status} ${response.statusText}`
        );
    }

    const json = (await response.json()) as DatasetMetadata;

    const mainUrl = json.resources?.find((r) => r.name === 'entities.ftm.json')?.url;
    const deltaUrl = json.delta_url;

    return [mainUrl, deltaUrl, json.version];
}

export async function getDeltaUrls(
    url: string,
    lastVersion: string
): Promise<Record<string, string> | null> {
    if (url.includes(`/${lastVersion}/`)) {
        return {};
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch delta metadata for "${url}": ${response.status} ${response.statusText}`
        );
    }

    const json = (await response.json()) as DeltaIndex;
    const versions = Object.keys(json.versions);
    const index = versions.indexOf(lastVersion);
    if (index === -1) {
        return null;
    }

    const deltaUrls: Record<string, string> = {};
    for (let i = index - 1; i >= 0; --i) {
        const version = versions[i]!;
        const url = json.versions[version]!;
        deltaUrls[version] = url;
    }

    return deltaUrls;
}

export function convertEntity(entity: Entity): IFlatEntityDatum {
    return {
        id: entity.id,
        schema: entity.schema,
        properties: entity.properties,
    };
}

export async function* streamEntities(url: string): AsyncGenerator<IFlatEntityDatum> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch entities from "${url}": ${response.status} ${response.statusText}`
        );
    }

    const readable = Readable.fromWeb(response.body as ReadableStream);

    const rl = createInterface({
        input: readable,
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        if (line) {
            const json = JSON.parse(line) as Entity;
            yield convertEntity(json);
        }
    }
}

export async function* streamDelta(url: string): AsyncGenerator<DeltaOperation> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch operations from "${url}": ${response.status} ${response.statusText}`
        );
    }

    const readable = Readable.fromWeb(response.body as ReadableStream);

    const rl = createInterface({
        input: readable,
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        if (line) {
            const json = JSON.parse(line) as DeltaOperation;
            yield json;
        }
    }
}
