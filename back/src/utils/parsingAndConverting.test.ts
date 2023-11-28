import type { DBForm } from '../dbModels/form';
import {
  getApiPathFromReqUrl,
  parseFormDataSortStringFromQueryString,
} from './parsingAndConverting';

describe('parsingAndConverting', () => {
  it('getApiPathFromReqUrl', () => {
    const apiPath1 = getApiPathFromReqUrl('/api/v1/mypath');
    const apiPath2 = getApiPathFromReqUrl('/api/v1/mypath/with-longer-path');
    expect(apiPath1).toBe('/mypath');
    expect(apiPath2).toBe('/mypath/with-longer-path');
  });

  it('parseFormDataSortStringFromQueryString', () => {
    const form = {
      form: {
        formElems: [
          {
            elemId: 'myelem0',
          },
          {
            elemId: 'myelem1',
          },
          {
            elemId: 'myelem2',
          },
          {
            elemId: 'myelem3',
          },
          {
            elemId: 'myelem4',
          },
        ],
      },
    } as DBForm;

    let sorterString = parseFormDataSortStringFromQueryString(undefined, form);
    expect(sorterString).toBe(undefined);

    sorterString = parseFormDataSortStringFromQueryString([], form);
    expect(sorterString).toBe(undefined);

    sorterString = parseFormDataSortStringFromQueryString(['created'], form);
    expect(sorterString).toBe('created.date');
    sorterString = parseFormDataSortStringFromQueryString(['-created'], form);
    expect(sorterString).toBe('-created.date');
    sorterString = parseFormDataSortStringFromQueryString(['edited'], form);
    expect(sorterString).toBe('edited.0.date');
    sorterString = parseFormDataSortStringFromQueryString(['created', '-edited'], form);
    expect(sorterString).toBe('created.date -edited.0.date');

    sorterString = parseFormDataSortStringFromQueryString(['(myelem0)'], form);
    expect(sorterString).toBe('data.0.value');
    sorterString = parseFormDataSortStringFromQueryString(['-(myelem3)'], form);
    expect(sorterString).toBe('-data.3.value');
    sorterString = parseFormDataSortStringFromQueryString(['-(myelem2)', '(myelem4)'], form);
    expect(sorterString).toBe('-data.2.value data.4.value');

    sorterString = parseFormDataSortStringFromQueryString(['0'], form);
    expect(sorterString).toBe('data.0.value');
    sorterString = parseFormDataSortStringFromQueryString(['-0'], form);
    expect(sorterString).toBe('-data.0.value');
    sorterString = parseFormDataSortStringFromQueryString(['0', '-2'], form);
    expect(sorterString).toBe('data.0.value -data.2.value');

    sorterString = parseFormDataSortStringFromQueryString(['0', '-(myelem3)'], form);
    expect(sorterString).toBe('data.0.value -data.3.value');
    sorterString = parseFormDataSortStringFromQueryString(
      ['0', '-(myelem3)', 'created', 'edited'],
      form
    );
    expect(sorterString).toBe('data.0.value -data.3.value created.date');
    sorterString = parseFormDataSortStringFromQueryString(['0', '-(myelem3)', 'created'], form);
    expect(sorterString).toBe('data.0.value -data.3.value created.date');
    sorterString = parseFormDataSortStringFromQueryString(
      ['0', '-(myelem3)', 'edited', 'created'],
      form
    );
    expect(sorterString).toBe('data.0.value -data.3.value created.date');
  });

  // @TODO: parseSearchQuery
  it('parseSearchQuery', () => {
    const form = {
      form: {
        formElems: [
          {
            elemId: 'myelem0',
          },
          {
            elemId: 'myelem1',
          },
          {
            elemId: 'myelem2',
          },
          {
            elemId: 'myelem3',
          },
          {
            elemId: 'myelem4',
          },
        ],
      },
    } as DBForm;
    form;
  });
});
