import { render, screen } from '@testing-library/react';
import StatCard from '../../components/shared/StatCard.tsx';
import { UsersIcon } from '../../components/icons/Icons.tsx';
import { describe, it, expect } from 'vitest';

describe('StatCard', () => {
  it('renders the title, value, and icon correctly', () => {
    render(
      <StatCard
        title="Total Dealers"
        value="123"
        icon={<UsersIcon data-testid="users-icon" />}
        color="bg-blue-500"
      />
    );

    // Check for title and value
    expect(screen.getByText('Total Dealers')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();

    // Check for icon
    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
  });
});
