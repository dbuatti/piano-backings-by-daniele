"use client";

import { format } from 'date-fns';

export const exportRequestsToCSV = (requests: any[]) => {
  if (!requests || requests.length === 0) return;

  // Define headers
  const headers = [
    "Date",
    "Client Name",
    "Client Email",
    "Song Title",
    "Artist/Musical",
    "Status",
    "Payment",
    "Cost (AUD)",
    "Delivery Date",
    "Internal Notes"
  ];

  // Map data to rows
  const rows = requests.map(req => [
    format(new Date(req.created_at), 'yyyy-MM-dd HH:mm'),
    `"${req.name || 'N/A'}"`,
    req.email,
    `"${req.song_title}"`,
    `"${req.musical_or_artist}"`,
    req.status,
    req.is_paid ? "Paid" : "Unpaid",
    req.cost || 0,
    req.delivery_date ? format(new Date(req.delivery_date), 'yyyy-MM-dd') : 'N/A',
    `"${(req.internal_notes || '').replace(/"/g, '""')}"`
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `backing_requests_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};