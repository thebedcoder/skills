import type { Comment, Ticket, TicketDraft, WebhookEvent } from "../models.js";

export interface PMAdapter {
  fetchTicket(ticketId: string): Promise<Ticket>;
  searchTickets(opts: {
    keywords?: string;
    labels?: string[];
    parentId?: string;
    type?: string;
    limit?: number;
  }): Promise<Ticket[]>;
  listSiblings(ticketId: string, limit?: number): Promise<Ticket[]>;
  createTicket(draft: TicketDraft): Promise<Ticket>;
  linkTickets(parentId: string, childIds: string[]): Promise<void>;
  postComment(ticketId: string, body: string): Promise<Comment>;
  editComment(ticketId: string, commentId: string, body: string): Promise<Comment>;
  listComments(ticketId: string): Promise<Comment[]>;
  verifyWebhook(headers: Record<string, string>, body: Buffer): boolean;
  parseWebhook(body: Buffer): WebhookEvent;
}
