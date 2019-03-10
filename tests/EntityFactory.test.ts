import { Book, Author, Publisher } from './entities';
import { MikroORM, Collection } from '../lib';
import { EntityFactory, ReferenceType } from '../lib/entity';
import { initORM, wipeDatabase } from './bootstrap';
import { BaseEntity } from './entities/BaseEntity';
import { MetadataDiscovery, MetadataStorage } from '../lib/metadata';

/**
 * @class EntityFactoryTest
 */
describe('EntityFactory', () => {

  let orm: MikroORM;
  let factory: EntityFactory;

  beforeAll(async () => {
    orm = await initORM();
    await new MetadataDiscovery(orm.em, orm.config, orm.config.getLogger()).discover();
    factory = new EntityFactory(orm.em.getUnitOfWork(), orm.em.getDriver(), orm.config);
  });
  beforeEach(async () => wipeDatabase(orm.em));

  test('should load entities', async () => {
    const metadata = MetadataStorage.getMetadata();
    expect(metadata).toBeInstanceOf(Object);
    expect(metadata[BaseEntity.name].properties['foo'].type).toBe('string');
    expect(metadata[Author.name]).toBeInstanceOf(Object);
    expect(metadata[Author.name].path).toBe(__dirname + '/entities/Author.ts');
    expect(metadata[Author.name].properties).toBeInstanceOf(Object);
    expect(metadata[Author.name].properties['books'].type).toBe(Book.name);
    expect(metadata[Author.name].properties['books'].reference).toBe(ReferenceType.ONE_TO_MANY);
    expect(metadata[Author.name].properties['foo'].type).toBe('string');
    expect(metadata[Book.name].properties['author'].type).toBe(Author.name);
    expect(metadata[Book.name].properties['author'].reference).toBe(ReferenceType.MANY_TO_ONE);
    expect(metadata[Publisher.name].properties['tests'].owner).toBe(true);
  });

  test('should return reference', async () => {
    const ref = factory.createReference(Book, '5b0d19b28b21c648c2c8a600');
    expect(ref).toBeInstanceOf(Book);
    expect(ref.id).toBe('5b0d19b28b21c648c2c8a600');
    expect(ref.title).toBeUndefined();
    expect(ref.toJSON()).toEqual({ id: '5b0d19b28b21c648c2c8a600' });
  });

  test('should return entity', async () => {
    const entity = factory.create(Author, { id: '5b0d19b28b21c648c2c8a600', name: 'test', email: 'mail@test.com' });
    expect(entity).toBeInstanceOf(Author);
    expect(entity.id).toBe('5b0d19b28b21c648c2c8a600');
    expect(entity.name).toBe('test');
    expect(entity.email).toBe('mail@test.com');
  });

  test('should return entity without id', async () => {
    const author = factory.create(Author, { name: 'test', favouriteBook: '5b0d19b28b21c648c2c8a600', email: 'mail@test.com' });
    expect(author).toBeInstanceOf(Author);
    expect(author.id).toBeNull();
    expect(author.name).toBe('test');
    expect(author.email).toBe('mail@test.com');
    expect(author.favouriteBook).toBeInstanceOf(Book);
    expect(author.favouriteBook.id).toBe('5b0d19b28b21c648c2c8a600');
  });

  test('should return entity without id [reference as constructor parameter]', async () => {
    // we need to use normal entity manager to have working identity map
    const author = orm.em['entityFactory'].createReference(Author, '5b0d19b28b21c648c2c8a600');
    expect(author.id).toBe('5b0d19b28b21c648c2c8a600');
    const book = orm.em.create(Book, { title: 'book title', author: author.id });
    expect(book).toBeInstanceOf(Book);
    expect(book.id).toBeNull();
    expect(book.title).toBe('book title');
    expect(book.author).toBe(author);

    // try with id of entity that is not managed
    const book2 = orm.em.create(Book, { title: 'book title', author: '5b0d19b28b21c648c2c8a601' });
    expect(book2).toBeInstanceOf(Book);
    expect(book2.id).toBeNull();
    expect(book2.title).toBe('book title');
    expect(book2.author).toBeInstanceOf(Author);
    expect(book2.author.id).toBe('5b0d19b28b21c648c2c8a601');
  });

  test('create should create entity without calling constructor', async () => {
    const p1 = new Publisher(); // calls constructor, so uses default name
    expect(p1.name).toBe('asd');
    expect(p1).toBeInstanceOf(Publisher);
    expect(p1.books).toBeInstanceOf(Collection);
    expect(p1.tests).toBeInstanceOf(Collection);
    const p2 = factory.create(Publisher, { id: '5b0d19b28b21c648c2c8a601' });
    expect(p2).toBeInstanceOf(Publisher);
    expect(p2.name).toBeUndefined();
    expect(p2.books).toBeInstanceOf(Collection);
    expect(p2.tests).toBeInstanceOf(Collection);
    const p3 = factory.create(Publisher, { id: '5b0d19b28b21c648c2c8a602', name: 'test' });
    expect(p3).toBeInstanceOf(Publisher);
    expect(p3.name).toBe('test');
    expect(p3.books).toBeInstanceOf(Collection);
    expect(p3.tests).toBeInstanceOf(Collection);
  });

  test('create should create entity without calling constructor', async () => {
    const p1 = new Publisher(); // calls constructor, so uses default name
    expect(p1.name).toBe('asd');
    expect(p1).toBeInstanceOf(Publisher);
    expect(p1.books).toBeInstanceOf(Collection);
    expect(p1.tests).toBeInstanceOf(Collection);
    const p2 = factory.createReference(Publisher, '5b0d19b28b21c648c2c8a600');
    expect(p2).toBeInstanceOf(Publisher);
    expect(p2.name).toBeUndefined();
    expect(p1.books).toBeInstanceOf(Collection);
    expect(p1.tests).toBeInstanceOf(Collection);
  });

  afterAll(async () => orm.close(true));

});
