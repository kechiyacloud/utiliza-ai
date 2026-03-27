-- Migration: Add assigned_to column to feedback_tickets
-- Run once against your PostgreSQL database before using the concurrent MCP workflow

ALTER TABLE feedback_tickets
    ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN feedback_tickets.assigned_to IS 'Teammate name who claimed this ticket via the MCP agent';
