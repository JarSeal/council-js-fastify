import { convertStringTo24Bytes } from './helpers';

describe('helpers utils', () => {
  it('convertStringTo24Bytes', () => {
    const str1 = convertStringTo24Bytes('someStr<>.,;:$!@#%&{([äöÅå])}-*_123'); // Too long and has characters to strip
    const str2 = convertStringTo24Bytes('someStr01'); // Too short
    const str3 = convertStringTo24Bytes('123456789012345678901234'); // 24 bytes exactly
    expect(str1).toBe('someStr.,$!@#%&{([])}-*_');
    expect(str2).toBe('someStr01someStr01someSt');
    expect(str3).toBe('123456789012345678901234');
  });
});
