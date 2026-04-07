import { renderHook, act } from '@testing-library/react';
import usePagination from '../../hooks/usePagination.ts';
import { describe, it, expect } from 'vitest';

const testData = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

describe('usePagination hook', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => usePagination(testData, 10));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedData.length).toBe(10);
    expect(result.current.paginatedData[0].name).toBe('Item 1');
  });

  it('should navigate to the next page', () => {
    const { result } = renderHook(() => usePagination(testData, 10));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedData.length).toBe(10);
    expect(result.current.paginatedData[0].name).toBe('Item 11');
  });

  it('should navigate to the previous page', () => {
    const { result } = renderHook(() => usePagination(testData, 10));

    act(() => {
      result.current.setCurrentPage(2);
    });

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.paginatedData[0].name).toBe('Item 1');
  });

  it('should not go beyond the last page or before the first page', () => {
    const { result } = renderHook(() => usePagination(testData, 10));

    act(() => {
      result.current.prevPage(); // Try to go before page 1
    });
    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.setCurrentPage(3);
    });
    act(() => {
      result.current.nextPage(); // Try to go after page 3
    });
    expect(result.current.currentPage).toBe(3);
  });
});
