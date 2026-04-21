import { request } from '@umijs/max';
import { App, Button, Form, Input, InputNumber, Select, Space, Table, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { FormProps } from 'antd';

type FieldType = {
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: number;
  site_id: string;
  creator_id: number;
  assigned_to?: number | null;
};

type TicketRecord = {
  id?: number | string;
  pk?: number | string;
  ticket_id?: number | string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | string;
  priority: number;
  site_id: string;
  creator_id: number;
  assigned_to?: number | null;
};

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Closed', value: 'CLOSED' },
];

const Tickets: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [form] = Form.useForm<FieldType>();
  const { message } = App.useApp();

  const normalizeTicketList = (payload: unknown): TicketRecord[] => {
    if (Array.isArray(payload)) return payload as TicketRecord[];
    if (!payload || typeof payload !== 'object') return [];

    const obj = payload as Record<string, unknown>;
    const candidates = [obj.results, obj.data, obj.items, obj.tickets, obj.rows];
    const list = candidates.find((item) => Array.isArray(item));
    return Array.isArray(list) ? (list as TicketRecord[]) : [];
  };

  const columns: ColumnsType<TicketRecord> = [
    {
      title: 'ID',
      key: 'id',
      width: 80,
      render: (_: unknown, record) => record.id ?? record.pk ?? record.ticket_id ?? '-',
    },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 140 },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 100 },
    { title: 'Site ID', dataIndex: 'site_id', key: 'site_id', width: 120 },
    { title: 'Creator ID', dataIndex: 'creator_id', key: 'creator_id', width: 120 },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_to',
      key: 'assigned_to',
      width: 130,
      render: (value: number | null | undefined) => value ?? '-',
    },
  ];

  const fetchTickets = async () => {
    try {
      setTableLoading(true);
      const data = await request<unknown>('/ticketing/tickets/', {
        method: 'GET',
        skipErrorHandler: true,
      });
      setTickets(normalizeTicketList(data));
    } catch (error) {
      setTickets([]);
      message.error('Failed to load tickets');
      console.error(error);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    try {
      setLoading(true);

      const payload = {
        ...values,
        assigned_to: values.assigned_to ?? null,
      };

      await request('/ticketing/tickets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: payload,
        skipErrorHandler: true,
      });

      message.success('Ticket created successfully');
      form.resetFields();
      form.setFieldsValue({
        status: 'OPEN',
        priority: 1,
      });
      await fetchTickets();
    } catch (error) {
      message.error('Failed to create ticket');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = (errorInfo) => {
    console.log('Validation failed:', errorInfo);
  };

  return (
    <div style={{ maxWidth: 1200 }}>
      <Typography.Title level={3}>Create Ticket</Typography.Title>

      <Form<FieldType>
        form={form}
        name="ticket-form"
        layout="vertical"
        initialValues={{
          status: 'OPEN',
          priority: 1,
        }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item<FieldType>
          label="Title"
          name="title"
          rules={[
            { required: true, message: 'Please input the title' },
            { max: 200, message: 'Title cannot exceed 200 characters' },
          ]}
        >
          <Input placeholder="Ticket title" maxLength={200} />
        </Form.Item>

        <Form.Item<FieldType>
          label="Description"
          name="description"
          rules={[{ required: true, message: 'Please input the description' }]}
        >
          <Input.TextArea rows={4} placeholder="Describe the issue" />
        </Form.Item>

        <Form.Item<FieldType>
          label="Status"
          name="status"
          rules={[{ required: true, message: 'Please select a status' }]}
        >
          <Select options={statusOptions} />
        </Form.Item>

        <Form.Item<FieldType>
          label="Priority"
          name="priority"
          rules={[{ required: true, message: 'Please input priority' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item<FieldType>
          label="Site ID"
          name="site_id"
          rules={[
            { required: true, message: 'Please input site ID' },
            { max: 5, message: 'Site ID cannot exceed 5 characters' },
          ]}
        >
          <Input placeholder="e.g. A1001" maxLength={5} />
        </Form.Item>

        <Form.Item<FieldType>
          label="Creator ID"
          name="creator_id"
          rules={[{ required: true, message: 'Please input creator user ID' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item<FieldType>
          label="Assigned To (User ID)"
          name="assigned_to"
          tooltip="Optional"
        >
          <InputNumber min={1} style={{ width: '100%' }} placeholder="Optional" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Ticket
            </Button>
            <Button
              htmlType="button"
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({ status: 'OPEN', priority: 1 });
              }}
            >
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Typography.Title level={4} style={{ marginTop: 32 }}>
        All Tickets
      </Typography.Title>
      <Table<TicketRecord>
        rowKey={(record, index) => String(record.id ?? record.pk ?? record.ticket_id ?? index)}
        columns={columns}
        dataSource={tickets}
        loading={tableLoading}
        scroll={{ x: 1100 }}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default Tickets;