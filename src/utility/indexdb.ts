import { IDBPDatabase, openDB } from 'idb';

interface StoreConfig {
  name: string;
  options?: IDBObjectStoreParameters;
}

class IndexedDB {
  private dbName: string;
  private db: IDBPDatabase<any> | null = null;

  constructor(dbName = 'MementoExtensionDB') {
    this.dbName = dbName;
  }

  static async create(
    dbName: string,
    stores: { name: string; options?: IDBObjectStoreParameters }[]
  ): Promise<IndexedDB> {
    const instance = new IndexedDB(dbName);
    await instance.init(stores);
    return instance;
  }

  async init(stores: StoreConfig[]) {
    this.db = await openDB(this.dbName);
    const existingStores = Array.from(this.db.objectStoreNames);
    const missingStores = stores.filter(s => !existingStores.includes(s.name));
    if (missingStores.length === 0) return; 
    const currentVersion = this.db.version;
    this.db.close();
    const newVersion = currentVersion + 1;
    this.db = await openDB(this.dbName, newVersion, {
      upgrade(upgradeDb) {
        for (const store of missingStores) {
          if (!upgradeDb.objectStoreNames.contains(store.name)) {
            upgradeDb.createObjectStore(store.name, store.options || { keyPath: 'id' });
            console.log(`Created store: ${store.name}`);
          }
        }
      },
    });
  }

  async get(storeName: string, key: IDBValidKey) {
    return await this.db?.get(storeName, key);
  }

  async getAll(storeName: string) {
    return await this.db?.getAll(storeName);
  }

  async put(storeName: string, value: any) {
    return await this.db?.put(storeName, value);
  }

  async delete(storeName: string, key: IDBValidKey) {
    return await this.db?.delete(storeName, key);
  }

  async clear(storeName: string) {
    return await this.db?.clear(storeName);
  }

  async keys(storeName: string) {
    return await this.db?.getAllKeys(storeName);
  }
}

export default IndexedDB;

  