import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Tag,
  Space,
  List,
  Typography,
  Empty,
  Spin,
  Popconfirm,
  message,
  Progress,
  Badge,
  Modal,
  Form,
  DatePicker,
  Input,
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { vaccinationsApi, membersApi } from '../../api';
import type { RecommendedVaccine } from '../../types/vaccination';
import styles from './Vaccinations.module.css';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// 状态标签组件
function StatusTag({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Tag color="success" icon={<CheckCircleOutlined />}>已接种</Tag>;
    case 'pending':
      return <Tag color="warning" icon={<ClockCircleOutlined />}>待接种</Tag>;
    case 'overdue':
      return <Tag color="error" icon={<ExclamationCircleOutlined />}>逾期</Tag>;
    case 'skipped':
      return <Tag color="default" icon={<StopOutlined />}>已跳过</Tag>;
    default:
      return <Tag>不适用</Tag>;
  }
}

// 快捷添加 Modal
interface QuickAddModalProps {
  open: boolean;
  memberId: string;
  memberName: string;
  vaccine: RecommendedVaccine | null;
  onClose: () => void;
  onSuccess: () => void;
}

function QuickAddModal({ open, memberId, memberName, vaccine, onClose, onSuccess }: QuickAddModalProps) {
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const createMutation = useMutation({
    mutationFn: vaccinationsApi.createRecord,
    onSuccess: () => {
      message.success('添加成功');
      form.resetFields();
      onSuccess();
      onClose();
    },
    onError: () => {
      message.error('添加失败');
    },
  });

  const handleSubmit = async () => {
    if (!vaccine) return;
    const values = await form.validateFields();
    createMutation.mutate({
      memberId,
      vaccineCode: vaccine.vaccine.code,
      vaccineName: vaccine.vaccine.name,
      doseNumber: vaccine.nextDoseNumber || 1,
      vaccinatedAt: values.vaccinatedAt.format('YYYY-MM-DD'),
      location: values.location,
      manufacturer: values.manufacturer,
      batchNumber: values.batchNumber,
    });
  };

  return (
    <Modal
      title="添加接种记录"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      confirmLoading={createMutation.isPending}
      destroyOnClose
    >
      {vaccine && (
        <Form form={form} layout="vertical" initialValues={{ vaccinatedAt: dayjs() }}>
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <Text type="secondary">成员：</Text>
            <Text strong style={{ marginLeft: 8 }}>{memberName}</Text>
            <br />
            <Text type="secondary">疫苗：</Text>
            <Text strong style={{ marginLeft: 8 }}>
              {vaccine.vaccine.name}
              {vaccine.vaccine.totalDoses > 1 && ` (第${vaccine.nextDoseNumber}剂)`}
            </Text>
          </div>

          <Form.Item
            name="vaccinatedAt"
            label="接种日期"
            rules={[{ required: true, message: '请选择接种日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
              inputReadOnly={isMobile}
            />
          </Form.Item>

          <Form.Item name="location" label="接种地点">
            <Input placeholder="如：社区卫生服务中心" />
          </Form.Item>

          <Form.Item name="manufacturer" label="疫苗厂商">
            <Input placeholder="可选" />
          </Form.Item>

          <Form.Item name="batchNumber" label="疫苗批号">
            <Input placeholder="可选" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

// 跳过确认 Modal
interface SkipModalProps {
  open: boolean;
  memberId: string;
  vaccine: RecommendedVaccine | null;
  onClose: () => void;
  onSuccess: () => void;
}

function SkipModal({ open, memberId, vaccine, onClose, onSuccess }: SkipModalProps) {
  const [form] = Form.useForm();

  const skipMutation = useMutation({
    mutationFn: vaccinationsApi.skipVaccine,
    onSuccess: () => {
      message.success('已跳过');
      form.resetFields();
      onSuccess();
      onClose();
    },
    onError: () => {
      message.error('操作失败');
    },
  });

  const handleSubmit = async () => {
    if (!vaccine) return;
    const values = await form.validateFields();
    skipMutation.mutate({
      memberId,
      vaccineCode: vaccine.vaccine.code,
      seasonLabel: vaccine.seasonLabel || 'lifetime',
      reason: values.reason,
    });
  };

  const getSeasonDisplay = () => {
    if (!vaccine?.seasonLabel || vaccine.seasonLabel === 'lifetime') {
      return '';
    }
    return ` (${vaccine.seasonLabel} 季)`;
  };

  return (
    <Modal
      title="跳过接种"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="确定跳过"
      cancelText="取消"
      confirmLoading={skipMutation.isPending}
      destroyOnClose
    >
      {vaccine && (
        <Form form={form} layout="vertical">
          <div style={{ marginBottom: 16 }}>
            <Text>
              确定跳过 <Text strong>{vaccine.vaccine.name}</Text>{getSeasonDisplay()} 的接种吗？
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              跳过后可随时取消跳过状态。
            </Text>
          </div>

          <Form.Item name="reason" label="跳过原因（可选）">
            <Input.TextArea rows={2} placeholder="如：已过接种期" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

// 单个疫苗卡片
function VaccineCardItem({
  item,
  onDelete,
  onQuickAdd,
  onSkip,
  onUnskip,
}: {
  item: RecommendedVaccine;
  onDelete: (id: string) => void;
  onQuickAdd: (vaccine: RecommendedVaccine) => void;
  onSkip: (vaccine: RecommendedVaccine) => void;
  onUnskip: (skipId: string) => void;
}) {
  return (
    <div className={styles.vaccineCard}>
      <div className={styles.vaccineCardHeader}>
        <Space wrap size={[8, 4]}>
          <Text strong>{item.vaccine.name}</Text>
          {item.vaccine.frequency === 'YEARLY' && item.seasonLabel && (
            <Tag color="blue" style={{ fontSize: 11 }}>{item.seasonLabel}</Tag>
          )}
          <StatusTag status={item.status} />
          {item.vaccine.totalDoses > 1 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({item.completedDoses}/{item.vaccine.totalDoses}剂)
            </Text>
          )}
        </Space>
      </div>

      {item.vaccine.description && (
        <div className={styles.vaccineCardDesc}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {item.vaccine.description}
          </Text>
        </div>
      )}

      {item.records.length > 0 && (
        <div className={styles.vaccineCardRecords}>
          <Text type="secondary" style={{ fontSize: 12 }}>接种记录：</Text>
          {item.records.map((r) => (
            <Tag key={r.id} style={{ marginLeft: 4, fontSize: 11 }}>
              第{r.doseNumber}剂 {new Date(r.vaccinatedAt).toLocaleDateString()}
            </Tag>
          ))}
        </div>
      )}

      <div className={styles.vaccineCardActions}>
        {(item.status === 'pending' || item.status === 'overdue') && (
          <>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => onQuickAdd(item)}>
              添加记录
            </Button>
            <Button size="small" icon={<StopOutlined />} onClick={() => onSkip(item)}>
              错过接种
            </Button>
          </>
        )}
        {item.status === 'skipped' && item.skipId && (
          <Popconfirm title="确定取消跳过吗？" onConfirm={() => onUnskip(item.skipId!)}>
            <Button size="small" icon={<UndoOutlined />}>取消跳过</Button>
          </Popconfirm>
        )}
        {item.status === 'completed' && item.records.length > 0 && (
          <Popconfirm title="确定删除最近一次接种记录吗？" onConfirm={() => onDelete(item.records[item.records.length - 1].id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除记录</Button>
          </Popconfirm>
        )}
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

// 疫苗分类组件
function VaccineCategory({
  title,
  vaccines,
  onDelete,
  onQuickAdd,
  onSkip,
  onUnskip,
}: {
  title: string;
  vaccines: RecommendedVaccine[];
  onDelete: (id: string) => void;
  onQuickAdd: (vaccine: RecommendedVaccine) => void;
  onSkip: (vaccine: RecommendedVaccine) => void;
  onUnskip: (skipId: string) => void;
}) {
  if (vaccines.length === 0) return null;

  const pendingVaccines = vaccines.filter((v) => v.status === 'pending' || v.status === 'overdue');
  const completedVaccines = vaccines.filter((v) => v.status === 'completed');
  const skippedVaccines = vaccines.filter((v) => v.status === 'skipped');

  const completedCount = completedVaccines.length;
  const totalCount = vaccines.length;

  const cardProps = { onDelete, onQuickAdd, onSkip, onUnskip };

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>{title}</span>
          <Progress
            percent={Math.round((completedCount / totalCount) * 100)}
            size="small"
            style={{ width: 100 }}
            format={() => `${completedCount}/${totalCount}`}
          />
        </Space>
      }
      className={styles.categoryCard}
    >
      {/* 待接种 - 默认展开，排在最前 */}
      <StatusGroup
        label="待接种"
        icon={<ClockCircleOutlined style={{ color: '#faad14' }} />}
        count={pendingVaccines.length}
        defaultExpanded={true}
      >
        {pendingVaccines.map((item) => (
          <VaccineCardItem key={item.vaccine.code} item={item} {...cardProps} />
        ))}
      </StatusGroup>

      {/* 已接种 - 默认折叠 */}
      <StatusGroup
        label="已接种"
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        count={completedVaccines.length}
        defaultExpanded={false}
      >
        {completedVaccines.map((item) => (
          <VaccineCardItem key={item.vaccine.code} item={item} {...cardProps} />
        ))}
      </StatusGroup>

      {/* 已跳过 - 默认折叠 */}
      <StatusGroup
        label="已跳过"
        icon={<StopOutlined style={{ color: '#999' }} />}
        count={skippedVaccines.length}
        defaultExpanded={false}
      >
        {skippedVaccines.map((item) => (
          <VaccineCardItem key={item.vaccine.code} item={item} {...cardProps} />
        ))}
      </StatusGroup>
    </Card>
  );
}

export default function VaccinationList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Modal 状态
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [selectedVaccine, setSelectedVaccine] = useState<RecommendedVaccine | null>(null);

  // 获取家庭成员列表
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  // 获取接种概览
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['vaccination-summary'],
    queryFn: vaccinationsApi.getSummary,
  });

  // 获取选中成员的接种计划
  const { data: schedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ['vaccination-schedule', selectedMemberId],
    queryFn: () => vaccinationsApi.getSchedule(selectedMemberId),
    enabled: !!selectedMemberId,
  });

  // 删除接种记录
  const deleteMutation = useMutation({
    mutationFn: vaccinationsApi.deleteRecord,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['vaccination-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['vaccination-summary'] });
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  // 取消跳过
  const unskipMutation = useMutation({
    mutationFn: vaccinationsApi.unskipVaccine,
    onSuccess: () => {
      message.success('已取消跳过');
      queryClient.invalidateQueries({ queryKey: ['vaccination-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['vaccination-summary'] });
    },
    onError: () => {
      message.error('操作失败');
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleQuickAdd = (vaccine: RecommendedVaccine) => {
    setSelectedVaccine(vaccine);
    setQuickAddOpen(true);
  };

  const handleSkip = (vaccine: RecommendedVaccine) => {
    setSelectedVaccine(vaccine);
    setSkipOpen(true);
  };

  const handleUnskip = (skipId: string) => {
    unskipMutation.mutate(skipId);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['vaccination-schedule'] });
    queryClient.invalidateQueries({ queryKey: ['vaccination-summary'] });
  };

  // 默认选中第一个成员
  if (!selectedMemberId && members.length > 0) {
    setSelectedMemberId(members[0].id);
  }

  const isLoading = loadingMembers || loadingSummary;
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={4} style={{ margin: 0 }}>疫苗接种管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/vaccinations/add')}
        >
          添加记录
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 成员选择按钮 */}
          <div className={styles.memberButtons}>
            {members.map((member) => {
              // 计算该成员的待完成任务数
              const pendingCount = summary?.pendingList.filter(
                (p) => p.memberId === member.id
              ).length || 0;

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

          {/* 接种计划 */}
          {loadingSchedule ? (
            <div className={styles.loading}>
              <Spin />
            </div>
          ) : schedule ? (
            <div className={styles.scheduleContainer}>
              <div className={styles.memberInfo}>
                <Text strong>{schedule.memberName}</Text>
                <Text type="secondary" style={{ marginLeft: 12 }}>
                  {schedule.ageYears}岁{schedule.ageMonths % 12}个月
                </Text>
              </div>

              {/* 儿童疫苗 */}
              <VaccineCategory
                title="儿童计划免疫"
                vaccines={schedule.childVaccines}

                onDelete={handleDelete}
                onQuickAdd={handleQuickAdd}
                onSkip={handleSkip}
                onUnskip={handleUnskip}
              />

              {/* 成人疫苗 */}
              <VaccineCategory
                title="成人疫苗"
                vaccines={schedule.adultVaccines}

                onDelete={handleDelete}
                onQuickAdd={handleQuickAdd}
                onSkip={handleSkip}
                onUnskip={handleUnskip}
              />

              {/* 老年人疫苗 */}
              <VaccineCategory
                title="老年人疫苗"
                vaccines={schedule.elderlyVaccines}

                onDelete={handleDelete}
                onQuickAdd={handleQuickAdd}
                onSkip={handleSkip}
                onUnskip={handleUnskip}
              />

              {/* 自定义疫苗记录 */}
              {schedule.customRecords.length > 0 && (
                <Card size="small" title="其他疫苗记录" className={styles.categoryCard}>
                  <List
                    size="small"
                    dataSource={schedule.customRecords}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="delete"
                            title="确定删除此接种记录吗？"
                            onConfirm={() => handleDelete(item.id)}
                          >
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <Text strong>{item.vaccineName}</Text>
                              <Tag color="success" icon={<CheckCircleOutlined />}>已接种</Tag>
                              {item.totalDoses && item.totalDoses > 1 && (
                                <Text type="secondary">
                                  (第{item.doseNumber}/{item.totalDoses}剂)
                                </Text>
                              )}
                            </Space>
                          }
                          description={
                            <Text type="secondary">
                              接种日期：{new Date(item.vaccinatedAt).toLocaleDateString()}
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {/* 空状态 */}
              {schedule.childVaccines.length === 0 &&
                schedule.adultVaccines.length === 0 &&
                schedule.elderlyVaccines.length === 0 &&
                schedule.customRecords.length === 0 && (
                  <Empty description="暂无疫苗接种记录" />
                )}
            </div>
          ) : (
            <Empty description="请选择家庭成员查看接种记录" />
          )}
        </>
      )}

      {/* 快捷添加 Modal */}
      <QuickAddModal
        open={quickAddOpen}
        memberId={selectedMemberId}
        memberName={selectedMember?.name || ''}
        vaccine={selectedVaccine}
        onClose={() => {
          setQuickAddOpen(false);
          setSelectedVaccine(null);
        }}
        onSuccess={handleModalSuccess}
      />

      {/* 跳过确认 Modal */}
      <SkipModal
        open={skipOpen}
        memberId={selectedMemberId}
        vaccine={selectedVaccine}
        onClose={() => {
          setSkipOpen(false);
          setSelectedVaccine(null);
        }}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
