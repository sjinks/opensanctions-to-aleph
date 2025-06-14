import { IEntityDatum } from '@alephdata/followthemoney';

export interface IFlatEntityDatum extends IEntityDatum {
    schema: string;
}

/**
 * @see https://www.opensanctions.org/docs/entities/
 */
export interface Entity extends IFlatEntityDatum {
    caption: string;
    referents: string[];
    datasets: string[];
    first_seen: string;
    last_seen: string;
    last_change: string;
    target: boolean;
}

/**
 * @see https://www.opensanctions.org/faq/80/bulk-deltas/#understanding-delta-data-files
 */
export interface DeltaRemoval {
    op: 'DEL';
    entity: Pick<Entity, 'id'>;
}

/**
 * @see https://www.opensanctions.org/faq/80/bulk-deltas/#understanding-delta-data-files
 */
export interface DeltaAddition {
    op: 'ADD';
    entity: Entity;
}

/**
 * @see https://www.opensanctions.org/faq/80/bulk-deltas/#understanding-delta-data-files
 */
export interface DeltaModification {
    op: 'MOD';
    entity: Entity;
}

export type DeltaOperation = DeltaRemoval | DeltaAddition | DeltaModification;

/**
 * @see https://www.opensanctions.org/faq/80/bulk-deltas/#how-to-access-delta-files
 */
export interface DeltaIndex {
    versions: Record<string, string>;
    unstable: {
        version_list: {
            version: string;
            url: string;
        }[];
    };
}

/**
 * @see https://www.opensanctions.org/docs/bulk/#metadata
 */
export interface DatasetMetadata {
    issue_levels: Record<string, number>;
    issue_count: number;
    updated_at: string;
    index_url: string;
    entity_count: number;
    target_count: number;
    thing_count: number;
    last_change: string;
    resources?: {
        name: string;
        url: string;
        checksum: string;
        mime_type: string;
        mime_type_label: string;
        title: string;
        size: number;
        path: string;
    }[];
    version: string;
    name: string;
    title: string;
    summary: string;
    description: string;
    url: string;
    tags: string[];
    coverage: {
        start: string;
        countries: string[];
        frequency: string;
    };
    publisher: {
        name: string;
        acronym: string;
        url: string;
        description: string;
        country: string;
        country_label: string;
        official: boolean;
    };
    hidden: boolean;
    disabled: boolean;
    data?: {
        url: string;
        format: string;
    };
    type: string;
    entry_point: string;
    last_export: string;
    issues_url: string;
    statistics_url: string;
    delta_url?: string;
    collections?: string[];
}
