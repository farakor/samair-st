import React from 'react';
import Sidebar from './Sidebar';
import FlightsTable from './FlightsTable';

export default function TablePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-64 flex flex-col h-screen overflow-hidden">
        <FlightsTable />
      </div>
    </div>
  );
} 