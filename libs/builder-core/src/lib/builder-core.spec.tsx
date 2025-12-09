import { render } from '@testing-library/react';

import BuilderCore from './builder-core';

describe('BuilderCore', () => {
  
  it('should render successfully', () => {
    const { baseElement } = render(<BuilderCore />);
    expect(baseElement).toBeTruthy();
  });
  
});
