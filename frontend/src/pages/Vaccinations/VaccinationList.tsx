import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Select,
  Tag,
  Space,
  Collapse,
  List,
  Typography,
  Alert,
  Empty,
  Spin,
  Popconfirm,
  message,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { vaccinationsApi, membersApi } from '../../api';
import type { VaccineSchedule, RecommendedVaccine } from '../../types/vaccination';
import styles from './Vaccinations.module.css';

const { Title, Text } = Typography;

// 状态标签组件
function StatusTag({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Tag color="success" icon={<CheckCircleOutlined />}>已完成</Tag>;
    case 'pending':
      return <Tag color="warning" icon={<ClockCircleOutlined />}>待接种</Tag>;
    case 'overdue':
      return <Tag color="error" icon={<ExclamationCircleOutlined />}>逾期</Tag>;
    default:
      return <Tag>不适用</Tag>;
  }
}

// 疫苗分类组件
function VaccineCategory({
  title,
  vaccines,
  onDelete,
}: {
  title: string;
  vaccines: RecommendedVaccine[];
  onDelete: (id: string) => void;
}) {
  if (vaccines.length === 0) return null;

  const completedCount = vaccines.filter((v) => v.status === 'completed').length;
  const totalCount = vaccines.length;

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
      <List
        size="small"
        dataSource={vaccines}
        renderItem={(item) => (
          <List.Item
            className={styles.vaccineItem}
            actions={
              item.records.length > 0
                ? [
                    <Popconfirm
                      key="delete"
                      title="确定删除最近一次接种记录吗？"
                      onConfirm={() => onDelete(item.records[item.records.length - 1].id)}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]
                : undefined
            }
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{item.vaccine.name}</Text>
                  <StatusTag status={item.status} />
                  {item.vaccine.totalDoses > 1 && (
                    <Text type="secondary">
                      ({item.completedDoses}/{item.vaccine.totalDoses}剂)
                    </Text>
                  )}
                </Space>
              }
              description={
                <Space direction="vertical" size={0}>
                  {item.vaccine.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.vaccine.description}
                    </Text>
                  )}
                  {item.records.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      接种记录：
                      {item.records.map((r) => (
                        <Tag key={r.id} size="small" style={{ marginLeft: 4 }}>
                          第{r.doseNumber}剂 {new Date(r.vaccinatedAt).toLocaleDateString()}
                        </Tag>
                      ))}
                    </Text>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}

export default function VaccinationList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // 获取家庭成员列表
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getMembers,
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

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // 默认选中第一个成员
  if (!selectedMemberId && members.length > 0) {
    setSelectedMemberId(members[0].id);
  }

  const isLoading = loadingMembers || loadingSummary;

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
          {/* 待接种提醒 */}
          {summary && (summary.pendingCount > 0 || summary.overdueCount > 0) && (
            <Alert
              type={summary.overdueCount > 0 ? 'error' : 'warning'}
              showIcon
              icon={<ExclamationCircleOutlined />}
              message={
                <span>
                  待接种提醒：
                  {summary.overdueCount > 0 && (
                    <Text type="danger" strong style={{ marginLeft: 8 }}>
                      {summary.overdueCount} 项逾期
                    </Text>
                  )}
                  {summary.pendingCount > 0 && (
                    <Text type="warning" strong style={{ marginLeft: 8 }}>
                      {summary.pendingCount} 项待接种
                    </Text>
                  )}
                </span>
              }
              description={
                <Collapse ghost size="small">
                  <Collapse.Panel header="查看详情" key="1">
                    <List
                      size="small"
                      dataSource={summary.pendingList}
                      renderItem={(item) => (
                        <List.Item>
                          <Space>
                            <Tag color={item.status === 'overdue' ? 'error' : 'warning'}>
                              {item.status === 'overdue' ? '逾期' : '待接种'}
                            </Tag>
                            <Text strong>{item.memberName}</Text>
                            <Text>{item.vaccineName}</Text>
                            {item.description && (
                              <Text type="secondary">- {item.description}</Text>
                            )}
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Collapse.Panel>
                </Collapse>
              }
              className={styles.alert}
            />
          )}

          {/* 成员选择 */}
          <div className={styles.memberSelect}>
            <Text strong>选择成员：</Text>
            <Select
              value={selectedMemberId}
              onChange={setSelectedMemberId}
              style={{ width: 200, marginLeft: 12 }}
              options={members.map((m) => ({ label: m.name, value: m.id }))}
              placeholder="请选择家庭成员"
            />
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
              />

              {/* 成人疫苗 */}
              <VaccineCategory
                title="成人疫苗"
                vaccines={schedule.adultVaccines}
                onDelete={handleDelete}
              />

              {/* 老年人疫苗 */}
              <VaccineCategory
                title="老年人疫苗"
                vaccines={schedule.elderlyVaccines}
                onDelete={handleDelete}
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
    </div>
  );
}
