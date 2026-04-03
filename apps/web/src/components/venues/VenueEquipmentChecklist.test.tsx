import { render, screen } from '../../../test/helpers/render';
import { VenueEquipmentChecklist } from './VenueEquipmentChecklist';

describe('VenueEquipmentChecklist', () => {
  it('renders nothing when no required equipment', () => {
    const { container } = render(
      <VenueEquipmentChecklist venueEquipment={['oven']} requiredEquipment={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows green check for available equipment', () => {
    render(
      <VenueEquipmentChecklist venueEquipment={['oven', 'grill']} requiredEquipment={['oven']} />
    );
    const item = screen.getByText('oven');
    expect(item).toHaveClass('text-green-800');
  });

  it('shows red X for missing equipment', () => {
    render(<VenueEquipmentChecklist venueEquipment={['grill']} requiredEquipment={['oven']} />);
    expect(screen.getByText(/add portable oven to resources/)).toBeInTheDocument();
  });

  it('matches case-insensitively', () => {
    render(
      <VenueEquipmentChecklist
        venueEquipment={['Oven', 'GRILL']}
        requiredEquipment={['oven', 'grill']}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Both should be green (matched)
    for (const item of items) {
      expect(item.querySelector('.text-green-600')).toBeTruthy();
    }
  });

  it('renders heading', () => {
    render(<VenueEquipmentChecklist venueEquipment={[]} requiredEquipment={['oven']} />);
    expect(screen.getByText('Equipment Checklist')).toBeInTheDocument();
  });
});
