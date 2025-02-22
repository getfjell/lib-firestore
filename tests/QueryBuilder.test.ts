/* eslint-disable no-undefined */
import { CollectionReference, DocumentReference, DocumentSnapshot, Firestore, Query } from '@google-cloud/firestore';
import { buildQuery } from '@/QueryBuilder';
import { ItemQuery } from '@fjell/core';

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

describe('QueryBuilder', () => {
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

  describe('buildQuery', () => {
    let queryMock: jest.Mocked<Query>;

    beforeEach(() => {
      queryMock = new (Query as any)();
      collectionRefMock.where.mockReturnValue(queryMock);
      queryMock.where.mockReturnValue(queryMock);
      queryMock.limit.mockReturnValue(queryMock);
      queryMock.offset.mockReturnValue(queryMock);
      queryMock.orderBy.mockReturnValue(queryMock);
    });

    it('should add delete query by default', () => {
      const itemQuery = {};
      const result = buildQuery(itemQuery, collectionRefMock);
      
      expect(collectionRefMock.where).toHaveBeenCalledWith('events.deleted.at', '==', null);
      expect(result).toBe(queryMock);
    });

    it('should add reference queries', () => {
      const itemQuery = {
        refs: {
          user: { pk: '123', kt: 'user' }
        }
      };
      
      buildQuery(itemQuery, collectionRefMock);

      expect(queryMock.where).toHaveBeenCalledWith('refs.user.pk', '==', '123');
      expect(queryMock.where).toHaveBeenCalledWith('refs.user.kt', '==', 'user');
    });

    it('should add event queries', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      const itemQuery = {
        events: {
          created: {
            start: startDate,
            end: endDate
          }
        }
      };

      buildQuery(itemQuery, collectionRefMock);

      expect(queryMock.where).toHaveBeenCalledWith('events.created.at', '>=', startDate);
      expect(queryMock.where).toHaveBeenCalledWith('events.created.at', '<', endDate);
    });

    it('should add reference queries with ComKey', () => {
      const itemQuery = {
        refs: {
          organization: {
            pk: '123', kt: 'org',
            loc: [
              { lk: 'branch1', kt: 'branch' },
              { lk: 'dept1', kt: 'department' }
            ]
          }
        }
      };
      
      buildQuery(itemQuery, collectionRefMock);

      expect(queryMock.where).toHaveBeenCalledWith('refs.organization.pk', '==', '123');
      expect(queryMock.where).toHaveBeenCalledWith('refs.organization.kt', '==', 'org');
      expect(queryMock.where).toHaveBeenCalledWith('refs.organization.loc[0].lk', '==', 'branch1');
      expect(queryMock.where).toHaveBeenCalledWith('refs.organization.loc[0].kt', '==', 'branch');
      expect(queryMock.where).toHaveBeenCalledWith('refs.organization.loc[1].lk', '==', 'dept1');
      expect(queryMock.where).toHaveBeenCalledWith('refs.organization.loc[1].kt', '==', 'department');
    });
    
    it('should add compound conditions', () => {
      const itemQuery = {
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            { column: 'name', value: 'test', operator: '==' },
            { column: 'age', value: 21, operator: '>=' }
          ]
        }
      } as unknown as ItemQuery;

      buildQuery(itemQuery, collectionRefMock);

      expect(queryMock.where).toHaveBeenCalled();
    });

    it('should handle nested compound conditions', () => {
      const itemQuery = {
        compoundCondition: {
          compoundType: 'OR',
          conditions: [
            { column: 'status', value: 'active', operator: '==' },
            {
              compoundType: 'AND',
              conditions: [
                { column: 'age', value: 21, operator: '>=' },
                { column: 'verified', value: true, operator: '==' }
              ]
            }
          ]
        }
      } as unknown as ItemQuery;

      buildQuery(itemQuery, collectionRefMock);

      expect(queryMock.where).toHaveBeenCalled();
    });

    it('should use == as default operator when operator not specified', () => {
      const itemQuery = {
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            { column: 'name', value: 'test' } // operator not specified
          ]
        }
      } as unknown as ItemQuery;

      buildQuery(itemQuery, collectionRefMock);

      expect(queryMock.where).toHaveBeenCalled();
    });

    it('should apply limit', () => {
      const itemQuery = {
        limit: 10
      };

      buildQuery(itemQuery, collectionRefMock);

      expect(queryMock.limit).toHaveBeenCalledWith(10);
    });

    it('should apply offset', () => {
      const itemQuery = {
        offset: 5
      };

      buildQuery(itemQuery, collectionRefMock);

      expect(queryMock.offset).toHaveBeenCalledWith(5);
    });

    it('should apply orderBy', () => {
      const itemQuery = {
        orderBy: [
          { field: 'name', direction: 'asc' },
          { field: 'age', direction: 'desc' }
        ]
      } as unknown as ItemQuery;

      buildQuery(itemQuery, collectionRefMock);

      expect(queryMock.orderBy).toHaveBeenCalledWith('name', 'asc');
      expect(queryMock.orderBy).toHaveBeenCalledWith('age', 'desc');
    });
  });

  // Add more describe blocks for other methods
});