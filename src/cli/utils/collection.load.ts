import { Database } from 'arangojs';

export const loadMigrationCollection = async (
  collectionName: string,
  database: Database,
) => {
  const col = database.collection(collectionName);
  if (!(await col.exists())) {
    await database.createCollection(collectionName);
    await col.ensureIndex({
      type: 'persistent',
      fields: ['name'],
      unique: true,
    });
  }
  return col;
};
