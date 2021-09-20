import type { CollectionRegistry, SchemaRegistry } from '@mcschema/core'
import { DataModel } from '@mcschema/core'
import * as java15 from '@mcschema/java-1.15'
import * as java16 from '@mcschema/java-1.16'
import * as java17 from '@mcschema/java-1.17'
import * as java18 from '@mcschema/java-1.18'
import config from '../config.json'
import { fetchData } from './DataFetcher'
import { message } from './Utils'

export const VersionIds = ['1.15', '1.16', '1.17', '1.18'] as const
export type VersionId = typeof VersionIds[number]

export type BlockStateRegistry = {
	[block: string]: {
		properties?: {
			[key: string]: string[],
		},
		default?: {
			[key: string]: string,
		},
	},
}

type VersionData = {
	collections: CollectionRegistry,
	schemas: SchemaRegistry,
	blockStates: BlockStateRegistry,
}
const Versions: Record<string, VersionData | Promise<VersionData>> = {}

type ModelData = {
	model: DataModel,
	version: VersionId,
}
const Models: Record<string, ModelData> = {}

const versionGetter: {
	[versionId in VersionId]: {
		getCollections: () => CollectionRegistry,
		getSchemas: (collections: CollectionRegistry) => SchemaRegistry,
	}
} = {
	1.15: java15,
	1.16: java16,
	1.17: java17,
	1.18: java18,
}

async function getVersion(id: VersionId): Promise<VersionData> {
	if (!Versions[id]) {
		Versions[id] = (async () => {
			try {
				const collections = versionGetter[id].getCollections()
				const blockStates: BlockStateRegistry = {}
				await fetchData(id, collections, blockStates)
				const schemas = versionGetter[id].getSchemas(collections)
				Versions[id] = { collections, schemas, blockStates }
				return Versions[id]
			} catch (e) {
				throw new Error(`Cannot get version "${id}": ${message(e)}`)
			}
		})()
		return Versions[id]
	}
	return Versions[id]
}

export async function getModel(version: VersionId, id: string): Promise<DataModel> {
	if (!Models[id] || Models[id].version !== version) {
		const versionData = await getVersion(version)
		const schemaName = config.generators.find(g => g.id === id)?.schema
		if (!schemaName) {
			throw new Error(`Cannot find model ${id}`)
		}
		try {
			const schema = versionData.schemas.get(schemaName)
			const model = new DataModel(schema)
			if (Models[id]) {
				model.reset(Models[id].model.data, false)
			} else {
				model.validate(true)
				model.history = [JSON.stringify(model.data)]
			}
			Models[id] = { model, version }
		} catch (e) {
			throw new Error(`Cannot get generator "${id}" for version "${version}": ${message(e)}`)
		}
	}
	return Models[id].model
}

export async function getCollections(version: VersionId): Promise<CollectionRegistry> {
	const versionData = await getVersion(version)
	return versionData.collections
}

export async function getBlockStates(version: VersionId): Promise<BlockStateRegistry> {
	const versionData = await getVersion(version)
	return versionData.blockStates
}

export function checkVersion(versionId: string, minVersionId: string | undefined, maxVersionId?: string) {
	const version = config.versions.findIndex(v => v.id === versionId)
	const minVersion = minVersionId ? config.versions.findIndex(v => v.id === minVersionId) : 0
	const maxVersion = maxVersionId ? config.versions.findIndex(v => v.id === maxVersionId) : config.versions.length - 1
	return minVersion <= version && version <= maxVersion
}
