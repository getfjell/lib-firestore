import { processDoc } from "@//DocProcessor";
import { Definition } from "@/Definition";
import { getGetOperation } from "@/ops/get";
import { getReference } from "@/ReferenceFinder";
import { AllItemTypeArrays, ComKey, Item, PriKey } from "@fjell/core";
import * as Library from "@fjell/lib";

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
jest.mock("@/ReferenceFinder");
jest.mock("@/DocProcessor");

describe('get', () => {
  type TestItem = Item<'test'>;
  let mockFirestore: any;
  let mockDocRef: any;
  let mockDoc: any;
  let definitionMock: jest.Mocked<Definition<TestItem, 'test'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDoc = {
      exists: true,
      data: jest.fn()
    };
    
    mockDocRef = {
      get: jest.fn().mockResolvedValue(mockDoc)
    };

    mockFirestore = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnValue(mockDocRef)
    };

    definitionMock = {
      collectionNames: ['tests'],
      coordinate: { kta: ['test'] },
      options: {}
    } as any;

    (getReference as jest.Mock).mockReturnValue(mockDocRef);
    (processDoc as jest.Mock).mockReturnValue({ key: { kt: 'test', pk: '123' }, id: '123', testField: 'test' });
  });

  it('should get document with PriKey', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    const keyTypes = ['test'] as AllItemTypeArrays<'test'>;

    const result = await getGetOperation(mockFirestore, definitionMock)(key);

    expect(getReference).toHaveBeenCalledWith(key, ['tests'], mockFirestore);
    expect(mockDocRef.get).toHaveBeenCalled();
    expect(processDoc).toHaveBeenCalledWith(mockDoc, keyTypes);
    expect(result).toEqual({ key: { kt: 'test', pk: '123' }, id: '123', testField: 'test' });
  });

  it('should get document with ComKey', async () => {
    definitionMock = {
      collectionNames: ['tests', 'orders'],
      coordinate: { kta: ['test', 'order'] },
      options: {}
    } as any;

    type ContainedItem = Item<'test', 'order'>;
    const key = {
      kt: 'test', pk: '123',
      loc: [{ kt: 'order', lk: '456' }]
    } as ComKey<'test', 'order'>;
    const keyTypes = ['test', 'order'] as AllItemTypeArrays<'test', 'order'>;
    (processDoc as jest.Mock).mockReturnValue({
      key: { kt: 'test', pk: '123', loc: [{kt: 'order', lk: '456'}] }, id: '123', testField: 'test' });

    // @ts-ignore
    const result = await getGetOperation<ContainedItem, 'test', 'order'>(mockFirestore, definitionMock)(key);

    expect(getReference).toHaveBeenCalledWith(key, ['tests', 'orders'], mockFirestore);
    expect(mockDocRef.get).toHaveBeenCalled();
    expect(processDoc).toHaveBeenCalledWith(mockDoc, keyTypes);
    expect(result).toEqual({
      key: { kt: 'test', pk: '123', loc: [{kt: 'order', lk: '456'}] },id: '123', testField: 'test' });
  });

  it('should throw NotFoundError when document does not exist', async () => {
    const key = { kt: 'test', pk: '123' } as PriKey<'test'>;
    
    mockDoc.exists = false;

    await expect(
      getGetOperation(mockFirestore, definitionMock)(key)
    ).rejects.toThrow(Library.NotFoundError);
  });

  it('should throw error for invalid key', async () => {
    const invalidKey = { invalid: 'key' };

    await expect(
      // @ts-ignore - Testing invalid key
      getGetOperation(mockFirestore, definitionMock)(invalidKey)
    ).rejects.toThrow('Key for Get is not a valid ItemKey');
  });
});
