const { createClient } = require('@supabase/supabase-js');

const url = 'https://iugvcvqiqsqvfxwsklyv.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1Z3ZjdnFpcXNxdmZ4d3NrbHl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MzgxMjMsImV4cCI6MjA2MjIxNDEyM30.eFbv_dD6WdC5XgA1gI59jG92yPcf1rO4uLg2w6Yy-3A';

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('approval_queue').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Total approval queue items in supabase:', data.length);
  for (const item of data) {
    console.log({
      id: item.id,
      entity_type: item.entity_type,
      module: item.module,
      record_no: item.record_no,
      party_name: item.party_name,
      warehouse_id: item.warehouse_id,
      items_summary: item.items_summary,
      amount: item.amount,
      status: item.status
    });
  }
}

check();
