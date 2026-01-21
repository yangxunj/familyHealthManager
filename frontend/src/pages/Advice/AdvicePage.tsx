import { useState } from 'react';
import {
  Card,
  Select,
  Button,
  Space,
  Spin,
  Empty,
  Progress,
  List,
  Tag,
  Collapse,
  Alert,
  Divider,
  Row,
  Col,
  message,
} from 'antd';
import {
  RobotOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adviceApi, membersApi } from '../../api';
import type { HealthAdvice, Concern, Suggestion, ActionItem } from '../../types';
import {
  ConcernLevelConfig,
  ActionPriorityConfig,
  SuggestionCategoryIcons,
} from '../../types';
import dayjs from 'dayjs';

const AdvicePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const { data: adviceList, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['advice', selectedMemberId],
    queryFn: () => adviceApi.getAll({ memberId: selectedMemberId }),
    enabled: showHistory,
  });

  const generateMutation = useMutation({
    mutationFn: adviceApi.generate,
    onSuccess: () => {
      message.success('健康建议生成成功');
      queryClient.invalidateQueries({ queryKey: ['advice'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '生成失败，请稍后重试');
    },
  });

  const handleGenerate = () => {
    if (!selectedMemberId) {
      message.warning('请先选择家庭成员');
      return;
    }
    generateMutation.mutate({ memberId: selectedMemberId });
  };

  // 渲染健康评分
  const renderHealthScore = (score: number | null) => {
    if (score === null) return null;

    let status: 'success' | 'normal' | 'exception' = 'normal';
    let color = '#1890ff';
    let text = '一般';

    if (score >= 90) {
      status = 'success';
      color = '#52c41a';
      text = '优秀';
    } else if (score >= 80) {
      color = '#52c41a';
      text = '良好';
    } else if (score >= 70) {
      color = '#faad14';
      text = '一般';
    } else if (score >= 60) {
      color = '#fa8c16';
      text = '欠佳';
    } else {
      status = 'exception';
      color = '#ff4d4f';
      text = '较差';
    }

    return (
      <div style={{ textAlign: 'center' }}>
        <Progress
          type="circle"
          percent={score}
          strokeColor={color}
          status={status}
          format={(percent) => (
            <div>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>{percent}</div>
              <div style={{ fontSize: 14, color: '#999' }}>{text}</div>
            </div>
          )}
        />
      </div>
    );
  };

  // 渲染关注事项
  const renderConcerns = (concerns: Concern[]) => {
    if (!concerns || concerns.length === 0) {
      return <Empty description="暂无需要关注的事项" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    const getIcon = (level: string) => {
      switch (level) {
        case 'critical':
          return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
        case 'warning':
          return <WarningOutlined style={{ color: '#faad14' }} />;
        default:
          return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      }
    };

    return (
      <List
        itemLayout="horizontal"
        dataSource={concerns}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={getIcon(item.level)}
              title={
                <Space>
                  <span>{item.title}</span>
                  <Tag color={ConcernLevelConfig[item.level as keyof typeof ConcernLevelConfig]?.color}>
                    {ConcernLevelConfig[item.level as keyof typeof ConcernLevelConfig]?.label}
                  </Tag>
                </Space>
              }
              description={item.description}
            />
          </List.Item>
        )}
      />
    );
  };

  // 渲染健康建议
  const renderSuggestions = (suggestions: Suggestion[]) => {
    if (!suggestions || suggestions.length === 0) {
      return <Empty description="暂无健康建议" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
      <Collapse
        defaultActiveKey={suggestions.map((_, i) => i.toString())}
        items={suggestions.map((item, index) => ({
          key: index.toString(),
          label: (
            <Space>
              <span>{SuggestionCategoryIcons[item.category] || '📝'}</span>
              <Tag>{item.category}</Tag>
              <span>{item.title}</span>
            </Space>
          ),
          children: <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.content}</p>,
        }))}
      />
    );
  };

  // 渲染行动清单
  const renderActionItems = (actionItems: ActionItem[]) => {
    if (!actionItems || actionItems.length === 0) {
      return <Empty description="暂无行动清单" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={actionItems}
        renderItem={(item, index) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <span
                  style={{
                    display: 'inline-flex',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#f0f0f0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                  }}
                >
                  {index + 1}
                </span>
              }
              title={
                <Space>
                  <span>{item.text}</span>
                  <Tag color={ActionPriorityConfig[item.priority as keyof typeof ActionPriorityConfig]?.color}>
                    {ActionPriorityConfig[item.priority as keyof typeof ActionPriorityConfig]?.label}优先级
                  </Tag>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  // 渲染建议报告
  const renderAdviceReport = (advice: HealthAdvice) => {
    return (
      <div>
        <Row gutter={24}>
          <Col xs={24} md={8}>
            <Card title="健康评分" bordered={false}>
              {renderHealthScore(advice.healthScore)}
              <Divider />
              <p style={{ textAlign: 'center', color: '#666', margin: 0 }}>
                生成时间：{dayjs(advice.generatedAt).format('YYYY-MM-DD HH:mm')}
              </p>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card title="健康概述" bordered={false}>
              <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0 }}>
                {advice.summary}
              </p>
            </Card>
          </Col>
        </Row>

        <Card title="需要关注" style={{ marginTop: 16 }}>
          {renderConcerns(advice.concerns)}
        </Card>

        <Card title="健康建议" style={{ marginTop: 16 }}>
          {renderSuggestions(advice.suggestions)}
        </Card>

        <Card title="行动清单" style={{ marginTop: 16 }}>
          {renderActionItems(advice.actionItems)}
        </Card>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>
          <RobotOutlined style={{ marginRight: 8 }} />
          AI 健康建议
        </h2>
        <Space>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? '隐藏历史' : '查看历史'}
          </Button>
        </Space>
      </div>

      <Alert
        message="免责声明"
        description="AI 健康建议仅供参考，不能替代专业医疗诊断和治疗。如有健康问题，请及时咨询专业医生。"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card style={{ marginBottom: 24 }}>
        <Space size="middle" wrap>
          <span>选择家庭成员：</span>
          <Select
            placeholder="请选择"
            style={{ width: 200 }}
            value={selectedMemberId}
            onChange={setSelectedMemberId}
          >
            {members?.map((member) => (
              <Select.Option key={member.id} value={member.id}>
                {member.name}
              </Select.Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleGenerate}
            loading={generateMutation.isPending}
            disabled={!selectedMemberId}
          >
            生成健康建议
          </Button>
        </Space>
      </Card>

      {generateMutation.isPending && (
        <Card>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: '#666' }}>
              AI 正在分析健康数据，请稍候...
            </p>
          </div>
        </Card>
      )}

      {!generateMutation.isPending && generateMutation.data && (
        renderAdviceReport(generateMutation.data)
      )}

      {!generateMutation.isPending && !generateMutation.data && showHistory && (
        <Card title="历史建议">
          {isLoadingHistory ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin />
            </div>
          ) : adviceList && adviceList.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={adviceList}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      onClick={() => generateMutation.reset()}
                    >
                      查看详情
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Progress
                        type="circle"
                        percent={item.healthScore || 0}
                        size={50}
                        strokeColor={
                          (item.healthScore || 0) >= 80
                            ? '#52c41a'
                            : (item.healthScore || 0) >= 60
                              ? '#faad14'
                              : '#ff4d4f'
                        }
                      />
                    }
                    title={
                      <Space>
                        <span>{item.member.name}</span>
                        <Tag>{dayjs(item.generatedAt).format('YYYY-MM-DD')}</Tag>
                      </Space>
                    }
                    description={item.summary?.substring(0, 100) + '...'}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无历史建议" />
          )}
        </Card>
      )}

      {!generateMutation.isPending &&
        !generateMutation.data &&
        !showHistory &&
        !selectedMemberId && (
          <Card>
            <Empty
              description="请选择家庭成员并点击生成按钮获取 AI 健康建议"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        )}
    </div>
  );
};

export default AdvicePage;
