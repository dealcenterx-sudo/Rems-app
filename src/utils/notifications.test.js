import { notifyUsers, dealRecipients } from './notifications';
import { addDoc } from 'firebase/firestore';

jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'me', email: 'me@example.com' } }
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn()
}));

beforeEach(() => {
  // CRA jest resets mock implementations between tests; restore here.
  addDoc.mockImplementation(() => Promise.resolve());
});

describe('dealRecipients', () => {
  it('includes the owner and all participants', () => {
    const deal = { userId: 'agent-1', participantIds: ['buyer-1', 'seller-1'] };
    expect(dealRecipients(deal)).toEqual(['agent-1', 'buyer-1', 'seller-1']);
  });

  it('handles deals without participantIds', () => {
    expect(dealRecipients({ userId: 'agent-1' })).toEqual(['agent-1']);
  });

  it('handles missing deal', () => {
    expect(dealRecipients(null)).toEqual([undefined]);
  });
});

describe('notifyUsers', () => {
  it('never notifies the sender', () => {
    notifyUsers(['me', 'other-1'], { type: 't', title: 'x' });
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(addDoc.mock.calls[0][1].recipientId).toBe('other-1');
  });

  it('dedupes recipients and skips falsy ids', () => {
    notifyUsers(['a', 'a', null, undefined, 'b'], { type: 't', title: 'x' });
    const recipients = addDoc.mock.calls.map((call) => call[1].recipientId);
    expect(recipients.sort()).toEqual(['a', 'b']);
  });

  it('stamps the actor and unread state on every notification', () => {
    notifyUsers(['a'], { type: 'deal-message', title: 'Hello', body: 'World', dealId: 'd1' });
    const payload = addDoc.mock.calls[0][1];
    expect(payload).toMatchObject({
      recipientId: 'a',
      actorId: 'me',
      actorEmail: 'me@example.com',
      type: 'deal-message',
      title: 'Hello',
      body: 'World',
      dealId: 'd1',
      read: false
    });
  });
});
