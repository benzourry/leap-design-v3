import {
  buildUmlClassDiagram,
  getUmlFormFieldCount,
  getUmlRelationships
} from './uml-diagram.util';

describe('buildUmlClassDiagram', () => {
  it('creates form and lookup classes with attributes and cardinality relationships', () => {
    const forms = [
      {
        id: 1,
        title: 'Request',
        items: {
          category: { code: 'category', type: 'select', subType: 'single', dataSource: 10 },
          tags: { code: 'tags', type: 'select', subType: 'multiple', dataSource: 10 },
          related: { code: 'related', type: 'modelPicker', subType: 'multiple', dataSource: 20 }
        }
      },
      { id: 2, title: 'Request Detail', prev: { id: 1 }, items: {} },
      { id: 3, title: 'Target Record', items: {} }
    ];
    const lookups = [{ id: 10, name: 'Category', dataFields: 'color:text,rank:number' }];
    const datasets = [{ id: 20, title: 'Target dataset', form: { id: 3 } }];
    const diagram = buildUmlClassDiagram(forms, lookups, datasets);

    expect(diagram).toContain('+category: select_single');
    expect(diagram).toContain('+code: string');
    expect(diagram).toContain('+color: text');
    expect(diagram).toContain('+rank: number');
    expect(diagram).toContain('direction TB');
    expect(diagram).toContain('class Form_1["Request (1)"]');
    expect(diagram).toContain('Form_1 "*" --> "1" Lookup_10 : category');
    expect(diagram).toContain('Form_1 "*" --> "*" Lookup_10 : tags');
    expect(diagram).toContain('Form_1 "*" --> "*" Form_3 : related via Target dataset');
    expect(diagram).toContain('Form_1 "1" <-- "*" Form_2 : previous form');
    expect(getUmlRelationships(forms, lookups, datasets).map(relationship => relationship.edgeId))
      .toEqual([
        'id_Form_1_Lookup_10_1',
        'id_Form_1_Lookup_10_2',
        'id_Form_1_Form_3_3',
        'id_Form_1_Form_2_4'
      ]);
  });

  it('excludes non-data component types and limits long forms until expanded', () => {
    const items = Object.fromEntries([
      ...Array.from({ length: 12 }, (_, index) => [
        `field${index + 1}`,
        { code: `field${index + 1}`, type: 'text' }
      ]),
      ...['static', 'speech', 'imagePreview', 'btn', 'dataset', 'screen'].map(type => [
        type,
        { code: type, type, dataSource: 10 }
      ])
    ]);
    const form = { id: 1, title: 'Large form', items };

    expect(getUmlFormFieldCount(form)).toBe(12);

    const collapsed = buildUmlClassDiagram([form], [{ id: 10, name: 'Lookup' }], []);
    expect(collapsed).toContain('+field10: text');
    expect(collapsed).not.toContain('+field11: text');
    expect(collapsed).toContain('+show_all_12_fields');
    expect(collapsed).not.toContain('+static:');
    expect(collapsed).not.toContain('+speech:');
    expect(collapsed).not.toContain(': imagePreview');
    expect(collapsed).not.toContain('+btn:');
    expect(collapsed).not.toContain('+dataset:');
    expect(collapsed).not.toContain('+screen:');
    expect(collapsed).not.toContain('Lookup_10');

    const expanded = buildUmlClassDiagram([form], [], [], new Set([1]));
    expect(expanded).toContain('+field12: text');
    expect(expanded).toContain('+show_fewer_fields');
  });
});
