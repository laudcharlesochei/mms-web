import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/StatusBadge';

describe('StatusBadge', () => {
  it('always shows the status word, not just a colour', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <StatusBadge status="OVERDUE" />
        <StatusBadge status="CONCERN" />
        <StatusBadge status="ON_TRACK" />
        <StatusBadge status="DUE" />
      </FluentProvider>,
    );
    ['Overdue', 'Concern', 'On track', 'Due'].forEach((w) => expect(screen.getByText(w)).toBeInTheDocument());
  });
});
