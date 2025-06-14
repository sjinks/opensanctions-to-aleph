import { Namespace } from '@alephdata/followthemoney';
import { AlephClient } from './client.mjs';
import type { IFlatEntityDatum } from '../opensanctions/types.mjs';

export async function findCollectionId(
    client: AlephClient,
    foreignId: string
): Promise<number | undefined> {
    const { data } = await client.GET('/api/2/collections', {
        params: {
            query: {
                q: foreignId,
                limit: 1000,
            } as unknown as undefined,
        },
    });

    const collection = data?.results?.find((c) => c.foreign_id === foreignId);
    if (!collection) {
        return undefined;
    }

    if (!collection.writeable) {
        throw new Error(`Collection "${foreignId}" is not writeable`);
    }

    return parseInt(collection.id!, 10);
}

export async function createCollection(client: AlephClient, foreignId: string): Promise<number> {
    const { data, error } = await client.POST('/api/2/collections', {
        body: {
            label: foreignId,
            foreign_id: foreignId,
        },
    });

    if (data) {
        return parseInt(data.id!, 10);
    }

    const e = error as Record<string, string>;
    throw new Error(`Failed to create collection "${foreignId}": ${e['message']}`);
}

export async function loadEntities(
    client: AlephClient,
    collectionId: number,
    entities: IFlatEntityDatum[]
): Promise<void> {
    await client.POST(`/api/2/collections/{collection_id}/bulk`, {
        params: {
            path: {
                collection_id: collectionId,
            },
        },
        body: entities,
    });
}

export async function removeEntities(
    client: AlephClient,
    foreignId: string,
    ids: string[]
): Promise<void> {
    const ns = new Namespace(foreignId);
    const BATCH_SIZE = 10;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);

        // eslint-disable-next-line no-await-in-loop
        const results = await Promise.all(
            batch.map((id) =>
                client.DELETE('/api/2/entities/{entity_id}', {
                    params: {
                        path: {
                            entity_id: ns.sign(id),
                        },
                    },
                })
            )
        );

        results.forEach((result, idx) => {
            const err = result.error as Record<string, string> | undefined;
            if (err) {
                process.emitWarning(`${err['message']} (${batch[idx]})`);
            }
        });
    }
}
