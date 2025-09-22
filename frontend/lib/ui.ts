import { CSSProperties } from 'react';

const buttonBase: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: 'none',
  textDecoration: 'none',
  cursor: 'pointer'
};

export const ui = {
  container: {
    padding: 20,
    maxWidth: 1000,
    margin: '0 auto'
  } as CSSProperties,
  card: {
    padding: 16,
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    background: 'white',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
  } as CSSProperties,
  buttons: {
    primary: { ...buttonBase, backgroundColor: '#0d6efd', color: 'white' } as CSSProperties,
    success: { ...buttonBase, backgroundColor: '#28a745', color: 'white' } as CSSProperties,
    danger: { ...buttonBase, backgroundColor: '#dc3545', color: 'white' } as CSSProperties,
    info: { ...buttonBase, backgroundColor: '#17a2b8', color: 'white' } as CSSProperties,
    muted: { ...buttonBase, backgroundColor: '#6c757d', color: 'white' } as CSSProperties,
    neutral: { ...buttonBase, backgroundColor: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb' } as CSSProperties,
    link: { ...buttonBase, backgroundColor: 'transparent', color: '#0d6efd' } as CSSProperties,
  },
  input: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: 4,
    width: '100%'
  } as CSSProperties,
  select: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: 4,
    width: '100%'
  } as CSSProperties,
  textarea: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: 4,
    width: '100%',
    minHeight: 80
  } as CSSProperties,
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  } as CSSProperties,
  sectionHeader: {
    fontWeight: 600,
    marginBottom: 6
  } as CSSProperties,
  emptyState: {
    padding: 20,
    border: '1px dashed #ccc',
    borderRadius: 8,
    background: '#fafafa',
    color: '#666'
  } as CSSProperties,
  tag: {
    padding: '2px 6px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    fontSize: '0.8em',
    borderRadius: 3
  } as CSSProperties
};
