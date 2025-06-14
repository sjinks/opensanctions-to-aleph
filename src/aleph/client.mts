import createClient, { type Middleware } from 'openapi-fetch/dist/index.mjs';
import type { paths } from './aleph.d.mts';

export function alephClient(
    baseUrl: string,
    apiKey: string
): ReturnType<typeof createClient<paths>> {
    const client = createClient<paths>({ baseUrl });
    const authMiddleware: Middleware = {
        onRequest({ request }) {
            request.headers.set('Authorization', `ApiKey ${apiKey}`);
            return request;
        },
    };

    client.use(authMiddleware);
    return client;
}

export type AlephClient = ReturnType<typeof alephClient>;
