import { render } from '@testing-library/react';

import ThemeSdk from './theme-sdk';

describe('ThemeSdk', () => {
  
  it('should render successfully', () => {
    const { baseElement } = render(<ThemeSdk />);
    expect(baseElement).toBeTruthy();
  });
  
});
