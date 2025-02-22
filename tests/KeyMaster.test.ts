/* eslint-disable no-undefined */
import { addKey, removeKey } from '@/KeyMaster';
import { Item } from '@fjell/core';
import { CollectionReference, DocumentReference, DocumentSnapshot, Firestore } from '@google-cloud/firestore';

jest.mock('@fjell/logging', () => {
  return {
    get: jest.fn().mockReturnThis(),
    getLogger: jest.fn().mockReturnThis(),
    default: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    emergency: jest.fn(),
    alert: jest.fn(),
    critical: jest.fn(),
    notice: jest.fn(),
    time: jest.fn().mockReturnThis(),
    end: jest.fn(),
    log: jest.fn(),
  }
});
jest.mock('@google-cloud/firestore');

describe('KeyMaster', () => {
  let firestoreMock: jest.Mocked<Firestore>;
  let collectionRefMock: jest.Mocked<CollectionReference>;
  let documentRefMock: jest.Mocked<DocumentReference>;
  let documentSnapshotMock: jest.Mocked<DocumentSnapshot>;
  // let queryMock: jest.Mocked<Query>;

  beforeEach(() => {
    firestoreMock = new (Firestore as any)();
    collectionRefMock = new (CollectionReference as any)();
    documentRefMock = new (DocumentReference as any)();
    documentSnapshotMock = new (DocumentSnapshot as any)();
    // queryMock = new (Query as any)();

    firestoreMock.collection.mockReturnValue(collectionRefMock);
    collectionRefMock.doc.mockReturnValue(documentRefMock);
    documentRefMock.get.mockResolvedValue(documentSnapshotMock);
    // @ts-ignore
    documentSnapshotMock.exists = true;
    documentSnapshotMock.data.mockReturnValue({});
  });

  describe('removeKey', () => {
    test('should remove the key from the item', () => {
      const item = { key: 'some-key' } as any;
      const result = removeKey(item);
      expect(result.key).toBeUndefined();
    });

    test('should not affect other properties of the item', () => {
      const item = { key: 'some-key', otherProp: 'some-value' } as any;
      const result = removeKey(item);
      expect(result.key).toBeUndefined();
      expect(result.otherProp).toBe('some-value');
    });

    test('should handle items without a key property gracefully', () => {
      const item = { otherProp: 'some-value' } as any;
      const result = removeKey(item);
      expect(result.key).toBeUndefined();
      expect(result.otherProp).toBe('some-value');
    });

    test('should handle empty items gracefully', () => {
      const item = {} as any;
      const result = removeKey(item);
      expect(result.key).toBeUndefined();
    });
  });

  describe('addKey', () => {

    test('should add a key to the item when keyTypes length is greater than 1', () => {
      const item = {} as Partial<Item<'test', 'container'>>;
      const doc = {
        id: 'doc-id',
        ref: {
          parent: {
            parent: {
              id: 'parent-id'
            }
          }
        }
      } as unknown as DocumentSnapshot;

      addKey(item, doc, ['test', 'container']);

      expect(item.key).toBeDefined();
      expect(item.key).toEqual({
        kt: 'test', pk: 'doc-id',
        loc: [{ kt: 'container', lk: 'parent-id' }]
      });
    });

    test('should add a key to the item when keyTypes length is greater than 2', () => {
      const item = {} as Partial<Item<'test', 'container', 'supercontainer'>>;
      const doc = {
        id: 'doc-id',
        ref: {
          parent: {
            parent: {
              id: 'parent-id',
              parent: {
                parent: {
                  id: 'superparent-id'
                }
              }
            }
          }
        }
      } as unknown as DocumentSnapshot;

      addKey(item, doc, ['test', 'container', 'supercontainer']);

      expect(item.key).toBeDefined();
      expect(item.key).toEqual({
        kt: 'test', pk: 'doc-id',
        loc: [
          { kt: 'container', lk: 'parent-id' },
          { kt: 'supercontainer', lk: 'superparent-id' },
        ]
      });
    });

    test('should add a key to the item when keyTypes length is greater than 3', () => {
      const item = {} as Partial<Item<'test', 'container', 'supercontainer', 'super2container'>>;
      const doc = {
        id: 'doc-id',
        ref: {
          parent: {
            parent: {
              id: 'parent-id',
              parent: {
                parent: {
                  id: 'superparent-id',
                  parent: {
                    parent: {
                      id: 'super2parent-id'
                    }
                  }
                }
              }
            }
          }
        }
      } as unknown as DocumentSnapshot;

      addKey(item, doc, ['test', 'container', 'supercontainer', 'super2container']);

      expect(item.key).toBeDefined();
      expect(item.key).toEqual({
        kt: 'test', pk: 'doc-id',
        loc: [
          { kt: 'container', lk: 'parent-id' },
          { kt: 'supercontainer', lk: 'superparent-id' },
          { kt: 'super2container', lk: 'super2parent-id' },
        ]
      });
    });

    test('should add a key to the item when keyTypes length is greater than 4', () => {
      const item = {} as Partial<Item<'test', 'container', 'supercontainer', 'super2container', 'super3container'>>;
      const doc = {
        id: 'doc-id',
        ref: {
          parent: {
            parent: {
              id: 'parent-id',
              parent: {
                parent: {
                  id: 'superparent-id',
                  parent: {
                    parent: {
                      id: 'super2parent-id',
                      parent: {
                        parent: {
                          id: 'super3parent-id'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } as unknown as DocumentSnapshot;

      addKey(item, doc, ['test', 'container', 'supercontainer', 'super2container', 'super3container']);

      expect(item.key).toBeDefined();
      expect(item.key).toEqual({
        kt: 'test', pk: 'doc-id',
        loc: [
          { kt: 'container', lk: 'parent-id' },
          { kt: 'supercontainer', lk: 'superparent-id' },
          { kt: 'super2container', lk: 'super2parent-id' },
          { kt: 'super3container', lk: 'super3parent-id' },
        ]
      });
    });

    test('should add a key to the item when keyTypes length is greater than 5', () => {
      const item = {} as
        Partial<Item<'test', 'container', 'supercontainer', 'super2container', 'super3container', 'super4container'>>;
      const doc = {
        id: 'doc-id',
        ref: {
          parent: {
            parent: {
              id: 'parent-id',
              parent: {
                parent: {
                  id: 'superparent-id',
                  parent: {
                    parent: {
                      id: 'super2parent-id',
                      parent: {
                        parent: {
                          id: 'super3parent-id',
                          parent: {
                            parent: {
                              id: 'super4parent-id'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } as unknown as DocumentSnapshot;

      addKey(
        item, doc, ['test', 'container', 'supercontainer', 'super2container', 'super3container', 'super4container']);

      expect(item.key).toBeDefined();
      expect(item.key).toEqual({
        kt: 'test', pk: 'doc-id',
        loc: [
          { kt: 'container', lk: 'parent-id' },
          { kt: 'supercontainer', lk: 'superparent-id' },
          { kt: 'super2container', lk: 'super2parent-id' },
          { kt: 'super3container', lk: 'super3parent-id' },
          { kt: 'super4container', lk: 'super4parent-id' },
        ]
      });
    });

    test('should add a key to the item when keyTypes length is 1', () => {
      const item = {} as Partial<Item<'test'>>;
      const doc = { id: 'doc-id' } as DocumentSnapshot;

      addKey(item, doc, ['test']);

      expect(item.key).toBeDefined();
      expect(item.key).toEqual({ kt: 'test', pk: 'doc-id' });
    });

    test('should handle items without a key property gracefully', () => {
      const item = {} as Partial<Item<'test'>>;
      const doc = { id: 'doc-id' } as DocumentSnapshot;

      addKey(item, doc, ['test']);

      expect(item.key).toBeDefined();
      expect(item.key).toEqual({ kt: 'test', pk: 'doc-id' });
    });

    test('should handle empty items gracefully', () => {
      const item = {} as Partial<Item<'test'>>;
      const doc = { id: 'doc-id' } as DocumentSnapshot;

      addKey(item, doc, ['test']);

      expect(item.key).toBeDefined();
      expect(item.key).toEqual({ kt: 'test', pk: 'doc-id' });
    });
  });

});