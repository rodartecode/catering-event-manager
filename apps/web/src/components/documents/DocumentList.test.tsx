import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/helpers/render';
import { DocumentList } from './DocumentList';

const mockUseQuery = vi.fn();
const mockDeleteMutate = vi.fn();
const mockToggleSharingMutate = vi.fn();
const mockFetchDownloadUrl = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    document: {
      listByEvent: {
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
      },
      delete: {
        useMutation: (options: { onSuccess?: () => void }) => ({
          mutate: (...args: unknown[]) => {
            mockDeleteMutate(...args);
            options.onSuccess?.();
          },
          isPending: false,
        }),
      },
      toggleSharing: {
        useMutation: (options: { onSuccess?: (data: { sharedWithClient: boolean }) => void }) => ({
          mutate: (...args: unknown[]) => {
            mockToggleSharingMutate(...args);
            options.onSuccess?.({ sharedWithClient: true });
          },
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      document: {
        listByEvent: { invalidate: vi.fn() },
        getDownloadUrl: { fetch: mockFetchDownloadUrl },
      },
    }),
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock DocumentTypeBadge
vi.mock('./DocumentTypeBadge', () => ({
  DocumentTypeBadge: ({ type }: { type: string }) => (
    <span data-testid="doc-type-badge">{type}</span>
  ),
}));

// Mock UploadDocumentDialog
vi.mock('./UploadDocumentDialog', () => ({
  UploadDocumentDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="upload-dialog">
      <button type="button" onClick={onClose}>
        Close Upload
      </button>
    </div>
  ),
}));

const mockDocuments = [
  {
    id: 1,
    name: 'Contract.pdf',
    type: 'contract',
    fileSize: 2048000,
    createdAt: new Date('2026-03-20'),
    sharedWithClient: true,
  },
  {
    id: 2,
    name: 'Menu-Draft.docx',
    type: 'proposal',
    fileSize: 512,
    createdAt: new Date('2026-03-22'),
    sharedWithClient: false,
  },
  {
    id: 3,
    name: 'Floor-Plan.png',
    type: 'floor_plan',
    fileSize: 1048576,
    createdAt: new Date('2026-03-25'),
    sharedWithClient: false,
  },
];

describe('DocumentList', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: mockDocuments,
      isLoading: false,
    });
    mockFetchDownloadUrl.mockResolvedValue({ url: 'https://example.com/download' });
  });

  it('renders loading skeleton when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(<DocumentList eventId={5} isAdmin={true} />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no documents', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    render(<DocumentList eventId={5} isAdmin={false} />);

    expect(screen.getByText('No documents uploaded yet.')).toBeInTheDocument();
  });

  it('renders empty state when data is null', () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false });

    render(<DocumentList eventId={5} isAdmin={false} />);

    expect(screen.getByText('No documents uploaded yet.')).toBeInTheDocument();
  });

  it('renders "Upload Document" button for admins', () => {
    render(<DocumentList eventId={5} isAdmin={true} />);

    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('does not render "Upload Document" button for non-admins', () => {
    render(<DocumentList eventId={5} isAdmin={false} />);

    expect(screen.queryByText('Upload Document')).not.toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<DocumentList eventId={5} isAdmin={false} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders Shared column header for admins', () => {
    render(<DocumentList eventId={5} isAdmin={true} />);

    expect(screen.getByRole('columnheader', { name: 'Shared' })).toBeInTheDocument();
  });

  it('does not render Shared column header for non-admins', () => {
    render(<DocumentList eventId={5} isAdmin={false} />);

    expect(screen.queryByText('Shared')).not.toBeInTheDocument();
  });

  it('renders document names', () => {
    render(<DocumentList eventId={5} isAdmin={false} />);

    expect(screen.getByText('Contract.pdf')).toBeInTheDocument();
    expect(screen.getByText('Menu-Draft.docx')).toBeInTheDocument();
    expect(screen.getByText('Floor-Plan.png')).toBeInTheDocument();
  });

  it('renders document type badges', () => {
    render(<DocumentList eventId={5} isAdmin={false} />);

    const badges = screen.getAllByTestId('doc-type-badge');
    expect(badges).toHaveLength(3);
    expect(badges[0]).toHaveTextContent('contract');
    expect(badges[1]).toHaveTextContent('proposal');
    expect(badges[2]).toHaveTextContent('floor_plan');
  });

  it('renders formatted file sizes', () => {
    render(<DocumentList eventId={5} isAdmin={false} />);

    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    expect(screen.getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
  });

  it('renders formatted dates', () => {
    render(<DocumentList eventId={5} isAdmin={false} />);

    const dateStr = new Date('2026-03-20').toLocaleDateString();
    expect(screen.getByText(dateStr)).toBeInTheDocument();
  });

  it('renders sharing status buttons for admins', () => {
    render(<DocumentList eventId={5} isAdmin={true} />);

    // Document 1 is shared, documents 2 and 3 are private
    const sharedButtons = screen.getAllByRole('button', { name: 'Shared' });
    expect(sharedButtons).toHaveLength(1);
    const privateButtons = screen.getAllByText('Private');
    expect(privateButtons).toHaveLength(2);
  });

  it('renders Download button for each document', () => {
    render(<DocumentList eventId={5} isAdmin={false} />);

    const downloadButtons = screen.getAllByText('Download');
    expect(downloadButtons).toHaveLength(3);
  });

  it('renders Delete button for admins', () => {
    render(<DocumentList eventId={5} isAdmin={true} />);

    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons).toHaveLength(3);
  });

  it('does not render Delete button for non-admins', () => {
    render(<DocumentList eventId={5} isAdmin={false} />);

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('opens upload dialog when "Upload Document" is clicked', async () => {
    render(<DocumentList eventId={5} isAdmin={true} />);

    await user.click(screen.getByText('Upload Document'));

    expect(screen.getByTestId('upload-dialog')).toBeInTheDocument();
  });

  it('calls download URL fetch on Download click', async () => {
    // Mock window.open
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<DocumentList eventId={5} isAdmin={false} />);

    const downloadButtons = screen.getAllByText('Download');
    await user.click(downloadButtons[0]);

    expect(mockFetchDownloadUrl).toHaveBeenCalledWith({ id: 1 });
    expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com/download', '_blank');

    windowOpenSpy.mockRestore();
  });

  it('calls toggle sharing mutation when sharing button is clicked', async () => {
    render(<DocumentList eventId={5} isAdmin={true} />);

    const privateButtons = screen.getAllByText('Private');
    await user.click(privateButtons[0]);

    expect(mockToggleSharingMutate).toHaveBeenCalledWith({ id: 2 });
  });

  it('calls delete mutation when Delete is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<DocumentList eventId={5} isAdmin={true} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockDeleteMutate).toHaveBeenCalledWith({ id: 1 });

    vi.restoreAllMocks();
  });

  it('does not call delete mutation when Delete is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<DocumentList eventId={5} isAdmin={true} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockDeleteMutate).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('calls useQuery with correct eventId', () => {
    render(<DocumentList eventId={42} isAdmin={false} />);

    expect(mockUseQuery).toHaveBeenCalledWith({ eventId: 42 });
  });
});
