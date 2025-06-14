# OpenSanctions to Aleph

A command-line tool for importing [OpenSanctions](https://www.opensanctions.org/) datasets into [Aleph](https://docs.alephdata.org/).

## Overview

This tool facilitates the process of importing sanctions data from OpenSanctions into Aleph, an open-source data platform for investigative journalists. It supports both full imports and incremental delta imports, which allows for efficient updates when only parts of the dataset have changed.

## Features

- Import complete OpenSanctions datasets into Aleph
- Support for incremental delta imports to minimize data transfer
- Automatic creation of collections in Aleph
- Configurable through environment variables or command-line arguments
- Tracking of import state to avoid unnecessary updates

## Installation

```bash
# Clone the repository
git clone https://github.com/sjinks/opensanctions-to-aleph.git
cd opensanctions-to-aleph

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

The tool can be configured using environment variables or command-line arguments:

### Environment Variables

- `ALEPHCLIENT_HOST` - Aleph host URL
- `ALEPHCLIENT_API_KEY` - Aleph API key

You can also use a `.env` file in the project root to set these variables.

## Usage

```bash
npx opensanctions-to-aleph [options] <dataset> [foreign-id]
```

### Arguments

- `dataset` - The name of the OpenSanctions dataset to import
- `foreign-id` - (Optional) The foreign ID to use for the collection in Aleph. Defaults to the dataset name.

### Options

- `-h, --host <host>` - Aleph host URL (overrides environment variable)
- `-k, --key <key>` - Aleph API key (overrides environment variable)
- `-d, --debug` - Enable debug output
- `-f, --full-import` - Force a full import even if delta updates are available
- `-s, --skip-removals` - Skip entity removals during delta imports

## Examples

### Basic Import

```bash
# Import the "us_ofac" dataset
npx opensanctions-to-aleph -h https://aleph.example.org -k YOUR_API_KEY us_ofac
```

### Full Import with Custom Collection ID

```bash
# Force a full import of the "eu_fsf" dataset with a custom collection foreign ID
npx opensanctions-to-aleph -h https://aleph.example.org -k YOUR_API_KEY --full-import eu_fsf custom_eu_sanctions
```

### Delta Import Using Environment Variables

```bash
# Set environment variables (or use .env file)
export ALEPHCLIENT_HOST=https://aleph.example.org
export ALEPHCLIENT_API_KEY=YOUR_API_KEY

# Perform a delta import
npx opensanctions-to-aleph un_sc
```

## Development

### Prerequisites

- Node.js 18 or higher
- TypeScript

### Setup

```bash
# Install development dependencies
npm install

# Generate type definitions from Aleph API
npm run generate-types

# Lint the code
npm run lint

# Build the project
npm run build
```

## How It Works

1. The tool first checks if a collection with the given foreign ID exists in Aleph
2. If not, it creates a new collection
3. It then fetches metadata for the requested OpenSanctions dataset
4. If possible and not disabled, it performs delta imports to efficiently update the data
5. Otherwise, it performs a full import of the entire dataset
6. The tool tracks the last processed version to enable efficient updates in future runs

## License

MIT
