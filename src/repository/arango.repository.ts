import { EventListenerMetadataStorage } from '../metadata/storages/event-metadata.storage';
import { Injectable } from '@nestjs/common';
import { Database } from 'arangojs';
import { ArangoError } from 'arangojs/error';
import { DocumentSelector } from 'arangojs/documents';
import { ArangoDocument } from '../documents/arango.document';
import { DocumentCollection, EdgeCollection } from 'arangojs/collection';
import { ArangoDocumentEdge } from '../documents/arango-edge.document';
import { Document, DocumentData } from 'arangojs/documents';
import {
  FindOneOptions,
  FindOneByOptions,
  FindManyOptions,
  FindManyByOptions,
  FindAllOptions,
  SaveOptions,
  UpdateOptions,
  ReplaceOptions,
  RemoveOptions,
  TruncateOptions,
} from '../interfaces/repository-options.types';
import { DeepPartial } from '../common/deep-partial.type';
import {
  TypeMetadata,
  TypeMetadataStorage,
} from '../metadata/storages/type-metadata.storage';
import { EventListenerType } from '../metadata/types/listener.type';
import {
  DocumentsFindMany,
  DocumentsFindOne,
  DocumentsUpdateAll,
  DocumentUpdate,
} from '../interfaces/repository-parameters.types';

@Injectable()
export class ArangoRepository<T extends ArangoDocument | ArangoDocumentEdge> {
  private readonly database: Database;
  private readonly targetMetadata: TypeMetadata;
  private readonly collection: DocumentCollection<T> & EdgeCollection<T>;
  private readonly eventListeners:
    | Map<EventListenerType, () => void>
    | undefined;

  public get collectionName() {
    return this.targetMetadata.collection;
  }

  constructor(database: Database, target: T) {
    this.database = database;
    this.targetMetadata = TypeMetadataStorage.getMetadata(
      target.constructor.name,
    );
    this.eventListeners = EventListenerMetadataStorage.getMetadata(
      target.constructor.name,
    );
    this.collection = this.database.collection<T>(this.collectionName);
  }

  async findOne(
    key: DocumentsFindOne,
    findOneOptions?: FindOneOptions,
  ): Promise<Document<T> | undefined> {
    if (findOneOptions?.transaction) {
      return await findOneOptions.transaction.step(() => {
        return this.collection.document(key, { graceful: true });
      });
    } else {
      return await this.collection.document(key, { graceful: true });
    }
  }

  async findOneBy(
    bindVars: Record<string, any>,
    findOneByOptions?: FindOneByOptions,
  ): Promise<Document<T> | undefined> {
    const filter = Object.entries(bindVars)
      ?.map<string>(([k]) => `FILTER d.${k} == @${k}`)
      .join(' ');
    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} RETURN d`;
    if (findOneByOptions?.transaction) {
      return await findOneByOptions.transaction.step(async () => {
        const cursor = await this.database.query<Document<T>>(
          aqlQuery,
          bindVars,
        );
        return await cursor.next();
      });
    } else {
      const cursor = await this.database.query<Document<T>>(aqlQuery, bindVars);
      return await cursor.next();
    }
  }

  async findMany(
    keys: DocumentsFindMany,
    findManyOptions?: FindManyOptions,
  ): Promise<Document<T>[]> {
    if (findManyOptions?.transaction) {
      return await findManyOptions.transaction.step(async () => {
        const results = await this.collection.documents(keys);
        return results.filter((doc: Document<T>) => {
          if ((doc as any).error) {
            return (doc as unknown as ArangoError).errorNum !== 1202;
          } else {
            return true;
          }
        });
      });
    } else {
      const documents = await this.collection.documents(keys);
      return documents.filter((doc: Document<T>) => {
        if ((doc as any).error) {
          return (doc as unknown as ArangoError).errorNum !== 1202;
        } else {
          return true;
        }
      });
    }
  }

  async findManyBy(
    bindVars: Record<string, any>,
    findManyByOptions?: FindManyByOptions,
  ): Promise<Document<T>[]> {
    const filter = Object.entries(bindVars)
      ?.map<string>(([k]) => `FILTER d.${k} == @${k}`)
      .join(' ');
    const pageSize = findManyByOptions?.pageSize ?? 10;
    const limit = `LIMIT ${
      (findManyByOptions?.page ?? 0) * pageSize
    }, ${pageSize}`;
    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} ${limit} RETURN d`;

    if (findManyByOptions?.transaction) {
      return await findManyByOptions.transaction.step(async () => {
        const cursor = await this.database.query<Document<T>>(
          aqlQuery,
          bindVars,
        );
        return await cursor.all();
      });
    } else {
      const cursor = await this.database.query<Document<T>>(aqlQuery, bindVars);
      return await cursor.all();
    }
  }

  async findAll(findAllOptions?: FindAllOptions): Promise<Document<T>[]> {
    const pageSize = findAllOptions?.pageSize ?? 10;
    const limit = `LIMIT ${
      (findAllOptions?.page ?? 0) * pageSize
    }, ${pageSize}`;
    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${limit} RETURN d`;
    if (findAllOptions?.transaction) {
      return await findAllOptions.transaction.step(async () => {
        const cursor = await this.database.query<Document<T>>(aqlQuery);
        return await cursor.all();
      });
    } else {
      const cursor = await this.database.query<Document<T>>(aqlQuery);
      return await cursor.all();
    }
  }

  async save(
    document: DeepPartial<T>,
    saveOptions?: SaveOptions,
  ): Promise<Document<T> | undefined> {
    this.eventListeners?.get(EventListenerType.BEFORE_SAVE)?.call(document);

    if (saveOptions?.transaction) {
      return await saveOptions?.transaction.step(async () => {
        return (
          await this.collection.save(document as DocumentData<T>, {
            returnNew: true,
          })
        ).new;
      });
    } else {
      return (await this.collection.save(document as T, { returnNew: true }))
        .new;
    }
  }

  async saveAll(
    documents: DeepPartial<T>[],
    saveAllOptions?: SaveOptions,
  ): Promise<(Document<T> | undefined)[]> {
    if (this.eventListeners?.get(EventListenerType.BEFORE_SAVE)) {
      documents.forEach((document) => {
        this.eventListeners?.get(EventListenerType.BEFORE_SAVE)?.call(document);
      });
    }

    if (saveAllOptions?.transaction) {
      return await saveAllOptions.transaction.step(async () => {
        return (
          await this.collection.saveAll(documents as T[], {
            returnNew: true,
          })
        ).map((item) => {
          return item.new;
        });
      });
    } else {
      return (
        await this.collection.saveAll(documents as T[], { returnNew: true })
      ).map((item) => {
        return item.new;
      });
    }
  }

  async update(
    document: DocumentUpdate<T>,
    updateOptions?: UpdateOptions,
  ): Promise<(Document<T> | undefined)[]> {
    this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)?.call(document);

    if (updateOptions?.transaction) {
      return await updateOptions.transaction.step(async () => {
        const result = await this.collection.update(document, document, {
          returnNew: true,
          returnOld: updateOptions.returnOld,
        });
        if (updateOptions.returnOld) {
          return [result.new, result.old];
        }
        return [result.new];
      });
    } else {
      const result = await this.collection.update(document, document, {
        returnNew: true,
        returnOld: updateOptions?.returnOld,
      });
      if (updateOptions?.returnOld) {
        return [result.new, result.old];
      }
      return [result.new];
    }
  }

  async updateAll(
    documents: DocumentsUpdateAll<T>,
    updateAllOptions?: UpdateOptions,
  ): Promise<(Document<T> | undefined)[][]> {
    if (this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)) {
      documents.forEach((document) => {
        this.eventListeners
          ?.get(EventListenerType.BEFORE_UPDATE)
          ?.call(document);
      });
    }

    if (updateAllOptions?.transaction) {
      return await updateAllOptions.transaction.step(async () => {
        const results = await this.collection.updateAll(documents, {
          returnNew: true,
          returnOld: updateAllOptions.returnOld ?? true,
        });
        if (updateAllOptions.returnOld) {
          return [
            results.map((item) => {
              return item.new;
            }),
            results.map((item) => {
              return item.old;
            }),
          ];
        } else {
          return [
            results.map((item) => {
              return item.new;
            }),
          ];
        }
      });
    } else {
      const results = await this.collection.updateAll(documents, {
        returnNew: true,
        returnOld: updateAllOptions?.returnOld ?? true,
      });
      if (updateAllOptions?.returnOld) {
        return [
          results.map((item) => {
            return item.new;
          }),
          results.map((item) => {
            return item.old;
          }),
        ];
      } else {
        return [
          results.map((item) => {
            return item.new;
          }),
        ];
      }
    }
  }

  async replace(
    selector: DocumentSelector,
    document: DeepPartial<T>,
    replaceOptions?: ReplaceOptions,
  ): Promise<(Document<T> | undefined)[]> {
    this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)?.call(document);

    if (replaceOptions?.transaction) {
      return await replaceOptions.transaction.step(async () => {
        const result = await this.collection.replace(
          selector,
          document as DocumentData<T>,
          {
            returnNew: true,
            returnOld: replaceOptions.returnOld ?? true,
          },
        );
        if (replaceOptions.returnOld) {
          return [result.new, result.old];
        } else {
          return [result.new];
        }
      });
    } else {
      const result = await this.collection.replace(
        selector,
        document as DocumentData<T>,
        {
          returnNew: true,
          returnOld: replaceOptions?.returnOld ?? true,
        },
      );
      if (replaceOptions?.returnOld) {
        return [result.new, result.old];
      } else {
        return [result.new];
      }
    }
  }

  async replaceAll(
    documents: DocumentsUpdateAll<T>,
    replaceAllOptions?: ReplaceOptions,
  ): Promise<(Document<T> | undefined)[][]> {
    if (this.eventListeners?.get(EventListenerType.BEFORE_UPDATE)) {
      documents.forEach((document) => {
        this.eventListeners
          ?.get(EventListenerType.BEFORE_UPDATE)
          ?.call(document);
      });
    }

    if (replaceAllOptions?.transaction) {
      return await replaceAllOptions.transaction.step(async () => {
        const results = await this.collection.replaceAll(documents as any, {
          returnNew: true,
          returnOld: replaceAllOptions.returnOld ?? true,
        });
        if (replaceAllOptions.returnOld) {
          return [
            results.map((item) => {
              return item.new;
            }),
            results.map((item) => {
              return item.old;
            }),
          ];
        } else {
          return [
            results.map((item) => {
              return item.new;
            }),
          ];
        }
      });
    } else {
      const results = await this.collection.replaceAll(documents as any, {
        returnNew: true,
        returnOld: replaceAllOptions?.returnOld ?? true,
      });
      if (replaceAllOptions?.returnOld) {
        return [
          results.map((item) => {
            return item.new;
          }),
          results.map((item) => {
            return item.old;
          }),
        ];
      } else {
        return [
          results.map((item) => {
            return item.new;
          }),
        ];
      }
    }
  }

  async remove(
    key: DocumentSelector,
    removeOptions?: RemoveOptions,
  ): Promise<Document<T> | undefined> {
    if (removeOptions?.transaction) {
      return await removeOptions.transaction.step(async () => {
        return (await this.collection.remove(key, { returnOld: true })).old;
      });
    } else {
      return (await this.collection.remove(key, { returnOld: true })).old;
    }
  }

  async removeBy(
    bindVars: Record<string, any>,
    removeByOptions?: RemoveOptions,
  ): Promise<(Document<T> | undefined)[]> {
    const entries: [string, any][] = Object.entries(bindVars);
    if (entries.length < 1) {
      throw new Error('No bindVars were specified!');
    }
    const filter = Object.entries(bindVars)
      ?.map<string>(([k]) => `FILTER d.${k} == @${k}`)
      .join(' ');
    const aqlQuery = `WITH ${this.collection.name} FOR d IN ${this.collection.name} ${filter} REMOVE d IN ${this.collection.name} RETURN OLD`;
    if (removeByOptions?.transaction) {
      return await removeByOptions.transaction.step(async () => {
        const cursor = await this.database.query<Document<T>>(
          aqlQuery,
          bindVars,
        );
        return await cursor.all();
      });
    } else {
      const cursor = await this.database.query<Document<T>>(aqlQuery, bindVars);
      return await cursor.all();
    }
  }

  async removeAll(
    keys: DocumentSelector[],
    removeAllOptions?: RemoveOptions,
  ): Promise<(Document<T> | undefined)[]> {
    if (removeAllOptions?.transaction) {
      return await removeAllOptions.transaction.step(async () => {
        return (await this.collection.removeAll(keys, { returnOld: true })).map(
          (item) => {
            return item.old;
          },
        );
      });
    } else {
      return (await this.collection.removeAll(keys, { returnOld: true })).map(
        (item) => {
          return item.old;
        },
      );
    }
  }

  async truncate(truncateOptions?: TruncateOptions): Promise<void> {
    if (truncateOptions?.transaction) {
      return await truncateOptions.transaction.step(async () => {
        await this.collection.truncate();
      });
    } else {
      await this.collection.truncate();
    }
  }
}
