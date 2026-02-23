import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Empty,
  Spin,
  Popconfirm,
  message,
  Badge,
  Modal,
  Form,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Grid,
} from 'antd';
import {
  PlusOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  StopOutlined,
  UndoOutlined,
  DownOutlined,
  RightOutlined,
  EditOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { checkupsApi, membersApi } from '../../api';
import { useDefaultMemberId } from '../../hooks/useDefaultMemberId';
import type { CheckItemWithStatus, CheckTemplate } from '../../types/checkup';
import styles from './Checkups.module.css';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// 间隔月数显示
function formatInterval(months: number): string {
  if (months >= 12 && months % 12 === 0) {
    const years = months / 12;
    return `每${years}年`;
  }
  return `每${months}个月`;
}

// 状态标签
function StatusTag({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Tag color="success" icon={<CheckCircleOutlined />}>已完成</Tag>;
    case 'pending':
      return <Tag color="warning" icon={<ClockCircleOutlined />}>待检查</Tag>;
    case 'skipped':
      return <Tag color="default" icon={<StopOutlined />}>已跳过</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
}

// 添加检查项目 Modal
function AddItemModal({
  open,
  memberId,
  memberName,
  templates,
  onClose,
  onSuccess,
}: {
  open: boolean;
  memberId: string;
  memberName: string;
  templates: CheckTemplate[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: checkupsApi.createItem,
    onSuccess: () => {
      message.success('添加成功');
      form.resetFields();
      setSelectedTemplate(null);
      onSuccess();
      onClose();
    },
    onError: () => {
      message.error('添加失败');
    },
  });

  const handleTemplateClick = (template: CheckTemplate) => {
    if (selectedTemplate === template.name) {
      setSelectedTemplate(null);
      form.resetFields();
    } else {
      setSelectedTemplate(template.name);
      form.setFieldsValue({
        name: template.name,
        intervalMonths: template.intervalMonths,
        description: template.description,
      });
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createMutation.mutate({
      memberId,
      name: values.name,
      intervalMonths: values.intervalMonths,
      description: values.description,
    });
  };

  return (
    <Modal
      title="添加检查项目"
      open={open}
      onCancel={() => {
        form.resetFields();
        setSelectedTemplate(null);
        onClose();
      }}
      onOk={handleSubmit}
      okText="添加"
      cancelText="取消"
      confirmLoading={createMutation.isPending}
      destroyOnClose
      width={560}
    >
      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
        <Text type="secondary">成员：</Text>
        <Text strong style={{ marginLeft: 8 }}>{memberName}</Text>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>快速选择模板：</Text>
      <div className={styles.templateList}>
        {templates.map((t) => (
          <div
            key={t.name}
            className={`${styles.templateItem} ${selectedTemplate === t.name ? styles.templateItemSelected : ''}`}
            onClick={() => handleTemplateClick(t)}
          >
            <Text strong style={{ fontSize: 13 }}>{t.name}</Text>
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{formatInterval(t.intervalMonths)}</Text>
          </div>
        ))}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="检查名称"
          rules={[{ required: true, message: '请输入检查名称' }]}
        >
          <Input placeholder="如：洗牙、年度体检" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="intervalMonths"
          label="检查间隔（月）"
          rules={[{ required: true, message: '请输入检查间隔' }]}
        >
          <Select placeholder="选择检查间隔">
            <Select.Option value={3}>每3个月</Select.Option>
            <Select.Option value={6}>每半年</Select.Option>
            <Select.Option value={12}>每年</Select.Option>
            <Select.Option value={24}>每2年</Select.Option>
            <Select.Option value={36}>每3年</Select.Option>
            <Select.Option value={60}>每5年</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="description" label="说明（可选）">
          <Input.TextArea rows={2} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// 添加完成记录 Modal
function AddRecordModal({
  open,
  item,
  onClose,
  onSuccess,
}: {
  open: boolean;
  item: CheckItemWithStatus | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const addMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Parameters<typeof checkupsApi.addRecord>[1] }) =>
      checkupsApi.addRecord(itemId, data),
    onSuccess: () => {
      message.success('记录添加成功');
      form.resetFields();
      onSuccess();
      onClose();
    },
    onError: () => {
      message.error('添加失败');
    },
  });

  const handleSubmit = async () => {
    if (!item) return;
    const values = await form.validateFields();
    addMutation.mutate({
      itemId: item.id,
      data: {
        checkDate: values.checkDate.format('YYYY-MM-DD'),
        location: values.location,
        doctor: values.doctor,
        findings: values.findings,
        notes: values.notes,
      },
    });
  };

  return (
    <Modal
      title="添加检查记录"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      confirmLoading={addMutation.isPending}
      destroyOnClose
    >
      {item && (
        <Form form={form} layout="vertical" initialValues={{ checkDate: dayjs() }}>
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <Text type="secondary">检查项目：</Text>
            <Text strong style={{ marginLeft: 8 }}>{item.name}</Text>
          </div>

          <Form.Item
            name="checkDate"
            label="检查日期"
            rules={[{ required: true, message: '请选择检查日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
              inputReadOnly={isMobile}
            />
          </Form.Item>

          <Form.Item name="location" label="检查地点">
            <Input placeholder="如：XX医院" />
          </Form.Item>

          <Form.Item name="doctor" label="医生">
            <Input placeholder="可选" />
          </Form.Item>

          <Form.Item name="findings" label="检查结果">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

// 编辑检查项目 Modal
function EditItemModal({
  open,
  item,
  onClose,
  onSuccess,
}: {
  open: boolean;
  item: CheckItemWithStatus | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof checkupsApi.updateItem>[1] }) =>
      checkupsApi.updateItem(id, data),
    onSuccess: () => {
      message.success('更新成功');
      onSuccess();
      onClose();
    },
    onError: () => {
      message.error('更新失败');
    },
  });

  const handleSubmit = async () => {
    if (!item) return;
    const values = await form.validateFields();
    updateMutation.mutate({
      id: item.id,
      data: {
        name: values.name,
        intervalMonths: values.intervalMonths,
        description: values.description,
      },
    });
  };

  return (
    <Modal
      title="编辑检查项目"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      confirmLoading={updateMutation.isPending}
      destroyOnClose
    >
      {item && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: item.name,
            intervalMonths: item.intervalMonths,
            description: item.description || '',
          }}
        >
          <Form.Item
            name="name"
            label="检查名称"
            rules={[{ required: true, message: '请输入检查名称' }]}
          >
            <Input maxLength={100} />
          </Form.Item>

          <Form.Item
            name="intervalMonths"
            label="检查间隔（月）"
            rules={[{ required: true, message: '请输入检查间隔' }]}
          >
            <InputNumber min={1} max={120} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="说明（可选）">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

// 历史记录 Modal
function RecordsModal({
  open,
  item,
  onClose,
  onDeleteRecord,
}: {
  open: boolean;
  item: CheckItemWithStatus | null;
  onClose: () => void;
  onDeleteRecord: (recordId: string) => void;
}) {
  if (!item) return null;

  return (
    <Modal
      title={`${item.name} - 检查记录`}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {item.records.length === 0 ? (
        <Empty description="暂无检查记录" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {item.records.map((record) => (
            <div
              key={record.id}
              style={{
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <Text strong>{new Date(record.checkDate).toLocaleDateString()}</Text>
                {record.location && (
                  <Text type="secondary" style={{ marginLeft: 12, fontSize: 13 }}>{record.location}</Text>
                )}
                {record.doctor && (
                  <Text type="secondary" style={{ marginLeft: 12, fontSize: 13 }}>医生：{record.doctor}</Text>
                )}
                {record.findings && (
                  <div style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 13 }}>{record.findings}</Text>
                  </div>
                )}
                {record.notes && (
                  <div style={{ marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.notes}</Text>
                  </div>
                )}
              </div>
              <Popconfirm title="确定删除此记录吗？" onConfirm={() => onDeleteRecord(record.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// 单个检查项目卡片
function CheckCardItem({
  item,
  onAddRecord,
  onSkip,
  onUnskip,
  onEdit,
  onDelete,
  onViewRecords,
}: {
  item: CheckItemWithStatus;
  onAddRecord: (item: CheckItemWithStatus) => void;
  onSkip: (item: CheckItemWithStatus) => void;
  onUnskip: (item: CheckItemWithStatus) => void;
  onEdit: (item: CheckItemWithStatus) => void;
  onDelete: (id: string) => void;
  onViewRecords: (item: CheckItemWithStatus) => void;
}) {
  return (
    <div className={styles.checkCard}>
      <div className={styles.checkCardHeader}>
        <Space wrap size={[8, 4]}>
          <Text strong>{item.name}</Text>
          <Tag color="blue" style={{ fontSize: 11 }}>{formatInterval(item.intervalMonths)}</Tag>
          <StatusTag status={item.status} />
        </Space>
      </div>

      {item.description && (
        <div className={styles.checkCardDesc}>
          <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
        </div>
      )}

      <div className={styles.checkCardInfo}>
        {item.lastCheckDate && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              上次检查：{new Date(item.lastCheckDate).toLocaleDateString()}
            </Text>
          </div>
        )}
        {item.status === 'pending' && item.overdueDays > 0 && (
          <div>
            <Text type="danger" style={{ fontSize: 12 }}>
              <ExclamationCircleOutlined style={{ marginRight: 4 }} />
              已逾期{item.overdueDays}天
            </Text>
          </div>
        )}
        {item.status === 'completed' && item.nextDueDate && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              下次检查：{new Date(item.nextDueDate).toLocaleDateString()}
            </Text>
          </div>
        )}
        {item.status === 'skipped' && item.skippedUntil && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              跳过至：{new Date(item.skippedUntil).toLocaleDateString()}
            </Text>
          </div>
        )}
      </div>

      <div className={styles.checkCardActions}>
        {item.status === 'pending' && (
          <>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => onAddRecord(item)}>
              完成
            </Button>
            <Button size="small" icon={<StopOutlined />} onClick={() => onSkip(item)}>
              跳过
            </Button>
          </>
        )}
        {item.status === 'completed' && (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => onAddRecord(item)}>
            添加记录
          </Button>
        )}
        {item.status === 'skipped' && (
          <Popconfirm title="确定取消跳过吗？" onConfirm={() => onUnskip(item)}>
            <Button size="small" icon={<UndoOutlined />}>取消跳过</Button>
          </Popconfirm>
        )}
        {item.records.length > 0 && (
          <Button size="small" icon={<HistoryOutlined />} onClick={() => onViewRecords(item)}>
            记录({item.records.length})
          </Button>
        )}
        <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(item)}>
          编辑
        </Button>
        <Popconfirm title="确定删除此检查项目吗？所有记录也将删除。" onConfirm={() => onDelete(item.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
}

// 可折叠分组
function StatusGroup({
  label,
  icon,
  count,
  defaultExpanded,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  defaultExpanded: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (count === 0) return null;

  return (
    <div className={styles.statusGroup}>
      <div className={styles.statusGroupHeader} onClick={() => setExpanded(!expanded)}>
        <Space>
          {expanded ? <DownOutlined style={{ fontSize: 11 }} /> : <RightOutlined style={{ fontSize: 11 }} />}
          {icon}
          <Text strong>{label}</Text>
          <Text type="secondary">({count})</Text>
        </Space>
      </div>
      <div className={`${styles.statusGroupContent} ${expanded ? styles.statusGroupContentExpanded : styles.statusGroupContentCollapsed}`}>
        <div className={styles.statusGroupContentInner}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function CheckupList() {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Modal 状态
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CheckItemWithStatus | null>(null);

  // 获取家庭成员
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  // 获取模板
  const { data: templates = [] } = useQuery({
    queryKey: ['checkup-templates'],
    queryFn: checkupsApi.getTemplates,
  });

  // 获取概览
  const { data: summary } = useQuery({
    queryKey: ['checkup-summary'],
    queryFn: checkupsApi.getSummary,
  });

  // 获取选中成员的检查项目
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['checkup-items', selectedMemberId],
    queryFn: () => checkupsApi.getItems(selectedMemberId),
    enabled: !!selectedMemberId,
  });

  // 删除检查项目
  const deleteItemMutation = useMutation({
    mutationFn: checkupsApi.deleteItem,
    onSuccess: () => {
      message.success('删除成功');
      invalidateAll();
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  // 跳过
  const skipMutation = useMutation({
    mutationFn: checkupsApi.skipItem,
    onSuccess: () => {
      message.success('已跳过');
      invalidateAll();
    },
    onError: () => {
      message.error('操作失败');
    },
  });

  // 取消跳过
  const unskipMutation = useMutation({
    mutationFn: checkupsApi.unskipItem,
    onSuccess: () => {
      message.success('已取消跳过');
      invalidateAll();
    },
    onError: () => {
      message.error('操作失败');
    },
  });

  // 删除记录
  const deleteRecordMutation = useMutation({
    mutationFn: checkupsApi.deleteRecord,
    onSuccess: () => {
      message.success('记录已删除');
      invalidateAll();
      // 刷新 records modal 中的数据
      if (selectedItem) {
        // 重新获取数据后关闭 modal
        setRecordsOpen(false);
        setSelectedItem(null);
      }
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['checkup-items'] });
    queryClient.invalidateQueries({ queryKey: ['checkup-summary'] });
  };

  // 默认选中"自己"的成员，找不到则选第一个
  useDefaultMemberId(members, selectedMemberId || undefined, setSelectedMemberId);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // 分组
  const pendingItems = items.filter((i) => i.status === 'pending');
  const completedItems = items.filter((i) => i.status === 'completed');
  const skippedItems = items.filter((i) => i.status === 'skipped');

  const cardProps = {
    onAddRecord: (item: CheckItemWithStatus) => {
      setSelectedItem(item);
      setAddRecordOpen(true);
    },
    onSkip: (item: CheckItemWithStatus) => {
      skipMutation.mutate(item.id);
    },
    onUnskip: (item: CheckItemWithStatus) => {
      unskipMutation.mutate(item.id);
    },
    onEdit: (item: CheckItemWithStatus) => {
      setSelectedItem(item);
      setEditItemOpen(true);
    },
    onDelete: (id: string) => {
      deleteItemMutation.mutate(id);
    },
    onViewRecords: (item: CheckItemWithStatus) => {
      setSelectedItem(item);
      setRecordsOpen(true);
    },
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={4} style={{ margin: 0 }}>定期检查管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddItemOpen(true)}
          disabled={!selectedMemberId}
        >
          添加检查项目
        </Button>
      </div>

      {loadingMembers ? (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 成员选择按钮 */}
          <div className={styles.memberButtons}>
            {members.map((member) => {
              const memberSummary = summary?.members.find((m) => m.memberId === member.id);
              const pendingCount = memberSummary?.pendingCount || 0;

              return (
                <Badge key={member.id} count={pendingCount} size="small" offset={[-5, 5]}>
                  <Button
                    type={selectedMemberId === member.id ? 'primary' : 'default'}
                    className={styles.memberButton}
                    onClick={() => setSelectedMemberId(member.id)}
                  >
                    {member.name}
                  </Button>
                </Badge>
              );
            })}
          </div>

          {/* 检查项目列表 */}
          {loadingItems ? (
            <div className={styles.loading}>
              <Spin />
            </div>
          ) : items.length > 0 ? (
            <Card size="small" className={styles.categoryCard}>
              <StatusGroup
                label="待检查"
                icon={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                count={pendingItems.length}
                defaultExpanded={true}
              >
                {pendingItems.map((item) => (
                  <CheckCardItem key={item.id} item={item} {...cardProps} />
                ))}
              </StatusGroup>

              <StatusGroup
                label="已完成"
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                count={completedItems.length}
                defaultExpanded={false}
              >
                {completedItems.map((item) => (
                  <CheckCardItem key={item.id} item={item} {...cardProps} />
                ))}
              </StatusGroup>

              <StatusGroup
                label="已跳过"
                icon={<StopOutlined style={{ color: '#999' }} />}
                count={skippedItems.length}
                defaultExpanded={false}
              >
                {skippedItems.map((item) => (
                  <CheckCardItem key={item.id} item={item} {...cardProps} />
                ))}
              </StatusGroup>
            </Card>
          ) : selectedMemberId ? (
            <Empty description="暂无检查项目，点击右上方添加">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddItemOpen(true)}>
                添加检查项目
              </Button>
            </Empty>
          ) : (
            <Empty description="请选择家庭成员" />
          )}
        </>
      )}

      {/* 添加检查项目 Modal */}
      <AddItemModal
        open={addItemOpen}
        memberId={selectedMemberId}
        memberName={selectedMember?.name || ''}
        templates={templates}
        onClose={() => setAddItemOpen(false)}
        onSuccess={invalidateAll}
      />

      {/* 添加完成记录 Modal */}
      <AddRecordModal
        open={addRecordOpen}
        item={selectedItem}
        onClose={() => {
          setAddRecordOpen(false);
          setSelectedItem(null);
        }}
        onSuccess={invalidateAll}
      />

      {/* 编辑检查项目 Modal */}
      <EditItemModal
        open={editItemOpen}
        item={selectedItem}
        onClose={() => {
          setEditItemOpen(false);
          setSelectedItem(null);
        }}
        onSuccess={invalidateAll}
      />

      {/* 历史记录 Modal */}
      <RecordsModal
        open={recordsOpen}
        item={selectedItem}
        onClose={() => {
          setRecordsOpen(false);
          setSelectedItem(null);
        }}
        onDeleteRecord={(recordId) => deleteRecordMutation.mutate(recordId)}
      />
    </div>
  );
}
