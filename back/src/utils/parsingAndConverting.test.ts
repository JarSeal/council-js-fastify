import { getApiPathFromReqUrl } from './parsingAndConverting';

describe('parsingAndConverting', () => {
  it('getApiPathFromReqUrl', () => {
    const apiPath1 = getApiPathFromReqUrl('/api/v1/mypath');
    const apiPath2 = getApiPathFromReqUrl('/api/v1/mypath/with-longer-path');
    expect(apiPath1).toBe('/mypath');
    expect(apiPath2).toBe('/mypath/with-longer-path');
  });
});
