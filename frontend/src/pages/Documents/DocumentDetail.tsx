import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Tag,
  Image,
  List,
  Modal,
  message,
  Spin,
  Space,
  Progress,
  Input,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  ScanOutlined,
  EditOutlined,
  SaveOutlined,
  RobotOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { documentsApi } from '../../api';
import type { FileInfo, OcrSseEvent } from '../../types';
import { DocumentTypeLabels, DocumentTypeColors } from '../../types';
import dayjs from 'dayjs';

const { TextArea } = Input;

const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);

  // 对比检查模态框状态: 'ocr' | 'parsed' | null
  const [compareMode, setCompareMode] = useState<'ocr' | 'parsed' | null>(null);
  const [compareFileIndex, setCompareFileIndex] = useState(0);

  // OCR 相关状态
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrCurrent, setOcrCurrent] = useState(0);
  const [ocrTotal, setOcrTotal] = useState(0);
  const cancelOcrRef = useRef<(() => void) | null>(null);

  // OCR 文本编辑状态
  const [isEditingOcr, setIsEditingOcr] = useState(false);
  const [editedOcrText, setEditedOcrText] = useState('');

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['memberStats'] });
      navigate('/documents');
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  // 保存 OCR 文本
  const saveOcrMutation = useMutation({
    mutationFn: ({ documentId, ocrText }: { documentId: string; ocrText: string }) =>
      documentsApi.updateOcrText(documentId, ocrText),
    onSuccess: () => {
      message.success('OCR 文本已保存');
      setIsEditingOcr(false);
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
    onError: (error: Error) => {
      message.error(error.message || '保存失败');
    },
  });

  // AI 规整：轮询状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAnalyzePolling = useCallback(() => {
    if (analyzeTimerRef.current) {
      clearInterval(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }
  }, []);

  const pollAnalyzeStatus = useCallback(() => {
    if (!id) return;
    stopAnalyzePolling();
    setIsAnalyzing(true);

    analyzeTimerRef.current = setInterval(async () => {
      try {
        const result = await documentsApi.getAnalyzeStatus(id);
        if (result.status === 'completed') {
          stopAnalyzePolling();
          setIsAnalyzing(false);
          message.success('AI 规整完成');
          queryClient.invalidateQueries({ queryKey: ['document', id] });
        } else if (result.status === 'failed') {
          stopAnalyzePolling();
          setIsAnalyzing(false);
          message.error(result.error || 'AI 规整失败');
          queryClient.invalidateQueries({ queryKey: ['document', id] });
        }
      } catch {
        stopAnalyzePolling();
        setIsAnalyzing(false);
        message.error('查询 AI 规整状态失败');
      }
    }, 3000);
  }, [id, queryClient, stopAnalyzePolling]);

  const handleStartAnalyze = useCallback(async () => {
    if (!id) return;
    try {
      await documentsApi.analyzeDocument(id);
      pollAnalyzeStatus();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'AI 规整启动失败';
      message.error(errMsg);
    }
  }, [id, pollAnalyzeStatus]);

  // 页面加载时，如果 analyzeStatus 为 processing，自动恢复轮询
  useEffect(() => {
    if (document?.analyzeStatus === 'processing') {
      pollAnalyzeStatus();
    }
    return () => stopAnalyzePolling();
  }, [document?.analyzeStatus, pollAnalyzeStatus, stopAnalyzePolling]);

  // 开始 OCR 识别
  const handleStartOcr = useCallback(() => {
    if (!id) return;

    setIsOcrRunning(true);
    setOcrProgress(0);
    setOcrMessage('开始 OCR 识别...');
    setOcrCurrent(0);
    setOcrTotal(0);

    const cancel = documentsApi.startOcr(
      id,
      (event: OcrSseEvent) => {
        if (event.type === 'progress') {
          setOcrProgress(event.progress);
          setOcrMessage(event.message || `识别中... ${event.progress}%`);
          if (event.current !== undefined) setOcrCurrent(event.current);
          if (event.total !== undefined) setOcrTotal(event.total);
        } else if (event.type === 'complete') {
          setOcrProgress(100);
          setOcrMessage('OCR 识别完成');
          message.success('OCR 识别完成');
          queryClient.invalidateQueries({ queryKey: ['document', id] });
          setIsOcrRunning(false);
        } else if (event.type === 'error') {
          message.error(event.error || 'OCR 识别失败');
          setIsOcrRunning(false);
        }
      },
      (error: Error) => {
        message.error(error.message || 'OCR 识别失败');
        setIsOcrRunning(false);
      },
      () => {
        setIsOcrRunning(false);
      },
    );

    cancelOcrRef.current = cancel;
  }, [id, queryClient]);

  // 取消 OCR
  const handleCancelOcr = useCallback(() => {
    if (cancelOcrRef.current) {
      cancelOcrRef.current();
      cancelOcrRef.current = null;
      setIsOcrRunning(false);
      setOcrProgress(0);
      setOcrMessage('');
      message.info('已取消 OCR 识别');
    }
  }, []);

  // 开始编辑 OCR 文本
  const handleStartEditOcr = useCallback(() => {
    setEditedOcrText(document?.ocrText || '');
    setIsEditingOcr(true);
  }, [document?.ocrText]);

  // 保存 OCR 文本
  const handleSaveOcrText = useCallback(() => {
    if (!id) return;
    saveOcrMutation.mutate({ documentId: id, ocrText: editedOcrText });
  }, [id, editedOcrText, saveOcrMutation]);

  // 取消编辑
  const handleCancelEditOcr = useCallback(() => {
    setIsEditingOcr(false);
    setEditedOcrText('');
  }, []);

  const handleDelete = () => {
    if (id) {
      deleteMutation.mutate(id);
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (mimeType === 'application/pdf') {
      return <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />;
    }
    if (mimeType?.startsWith('image/')) {
      return <FileImageOutlined style={{ fontSize: 48, color: '#136dec' }} />;
    }
    return <FileTextOutlined style={{ fontSize: 48, color: 'var(--color-text-tertiary)' }} />;
  };

  const isImage = (mimeType?: string) => mimeType?.startsWith('image/') ?? false;
  const isPdf = (mimeType?: string) => mimeType === 'application/pdf';

  const handlePreview = (file: FileInfo) => {
    if (isImage(file.mimeType)) {
      setPreviewFile(file);
      setPreviewVisible(true);
    } else if (isPdf(file.mimeType)) {
      window.open(file.url, '_blank');
    }
  };

  const handleDownload = (file: FileInfo) => {
    const link = window.document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!document) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <p>文档不存在</p>
        <Button onClick={() => navigate('/documents')}>返回列表</Button>
      </div>
    );
  }

  const hasOcrText = !!document.ocrText;
  const parsedData = document.parsedData as { type?: string; content?: string } | null;
  const hasParsedData = !!parsedData;
  const parsedMarkdown = parsedData?.type === 'markdown' ? parsedData.content || '' : '';

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
          返回列表
        </Button>
        <Space wrap>
          {/* OCR 识别按钮 */}
          {isOcrRunning ? (
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={handleCancelOcr}
            >
              取消识别
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<ScanOutlined />}
              onClick={handleStartOcr}
              disabled={!document.files || document.files.length === 0}
            >
              OCR 识别
            </Button>
          )}

          {/* AI 规整按钮 */}
          <Button
            type="default"
            icon={<RobotOutlined />}
            onClick={handleStartAnalyze}
            loading={isAnalyzing}
            disabled={!hasOcrText || isOcrRunning || isAnalyzing}
            title={!hasOcrText ? '请先进行 OCR 识别' : ''}
          >
            {isAnalyzing ? 'AI 规整中...' : 'AI 规整'}
          </Button>

          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModalOpen(true)}
          >
            删除文档
          </Button>
        </Space>
      </div>

      {/* OCR 进度显示 */}
      {isOcrRunning && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <Progress
              percent={ocrProgress}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <p style={{ marginTop: 8, marginBottom: 0, color: 'var(--color-text-tertiary)' }}>
              {ocrMessage}
              {ocrTotal > 0 && ` (${ocrCurrent}/${ocrTotal})`}
            </p>
          </div>
        </Card>
      )}

      <Card title="文档信息" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="文档名称">{document.name}</Descriptions.Item>
          <Descriptions.Item label="文档类型">
            <Tag color={DocumentTypeColors[document.type]}>
              {DocumentTypeLabels[document.type]}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="家庭成员">{document.member?.name}</Descriptions.Item>
          <Descriptions.Item label="检查日期">
            {dayjs(document.checkDate).format('YYYY-MM-DD')}
          </Descriptions.Item>
          <Descriptions.Item label="检查机构">
            {document.institution || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="上传时间">
            {dayjs(document.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="OCR 状态">
            {document.ocrStatus === 'completed' ? (
              <Tag color="success">已完成</Tag>
            ) : document.ocrStatus === 'processing' ? (
              <Tag color="processing">处理中</Tag>
            ) : document.ocrStatus === 'failed' ? (
              <Tag color="error">失败</Tag>
            ) : (
              <Tag>未识别</Tag>
            )}
          </Descriptions.Item>
          {document.notes && (
            <Descriptions.Item label="备注" span={2}>
              {document.notes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title={`文件列表 (${document.files?.length || 0} 个)`} style={{ marginBottom: 24 }}>
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
          dataSource={document.files || []}
          renderItem={(file: FileInfo) => (
            <List.Item>
              <Card
                hoverable
                cover={
                  isImage(file.mimeType) ? (
                    <div
                      style={{
                        height: 150,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--color-bg-hover)',
                      }}
                    >
                      <img
                        src={file.url}
                        alt={file.originalName}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        height: 150,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--color-bg-hover)',
                      }}
                    >
                      {getFileIcon(file.mimeType)}
                    </div>
                  )
                }
                actions={[
                  <Button
                    key="preview"
                    type="link"
                    size="small"
                    onClick={() => handlePreview(file)}
                  >
                    预览
                  </Button>,
                  <Button
                    key="download"
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(file)}
                  >
                    下载
                  </Button>,
                ]}
              >
                <Card.Meta
                  title={
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                      title={file.originalName}
                    >
                      {file.originalName}
                    </span>
                  }
                  description={file.size ? `${(file.size / 1024).toFixed(1)} KB` : '-'}
                />
              </Card>
            </List.Item>
          )}
        />
      </Card>

      {/* OCR 识别结果展示 */}
      {hasOcrText && (
        <Card
          title="OCR 识别结果"
          style={{ marginBottom: 24 }}
          extra={
            !isEditingOcr ? (
              <Space>
                {document.files && document.files.length > 0 && (
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      setCompareFileIndex(0);
                      setCompareMode('ocr');
                    }}
                  >
                    对比检查
                  </Button>
                )}
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={handleStartEditOcr}
                >
                  编辑
                </Button>
              </Space>
            ) : (
              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveOcrText}
                  loading={saveOcrMutation.isPending}
                  size="small"
                >
                  保存
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancelEditOcr}
                  size="small"
                >
                  取消
                </Button>
              </Space>
            )
          }
        >
          {isEditingOcr ? (
            <TextArea
              value={editedOcrText}
              onChange={(e) => setEditedOcrText(e.target.value)}
              rows={15}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          ) : (
            <div
              style={{
                maxHeight: 400,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: 12,
                background: 'var(--color-bg-hover)',
                padding: 16,
                borderRadius: 4,
              }}
            >
              {document.ocrText}
            </div>
          )}
        </Card>
      )}

      {/* AI 规整失败提示 */}
      {document.analyzeStatus === 'failed' && document.analyzeError && (
        <Alert
          message="AI 规整失败"
          description={document.analyzeError}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* AI 规整结果展示 */}
      {hasParsedData && (
        <Card
          title="AI 规整结果"
          style={{ marginBottom: 24 }}
          extra={
            document.files && document.files.length > 0 && (
              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={() => {
                  setCompareFileIndex(0);
                  setCompareMode('parsed');
                }}
              >
                对比检查
              </Button>
            )
          }
        >
          <div className="markdown-body" style={{ lineHeight: 1.8 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsedMarkdown}</ReactMarkdown>
          </div>
        </Card>
      )}

      <Image
        style={{ display: 'none' }}
        preview={{
          visible: previewVisible,
          src: previewFile?.url,
          onVisibleChange: (visible) => {
            setPreviewVisible(visible);
            if (!visible) {
              setPreviewFile(null);
            }
          },
        }}
      />

      <Modal
        title="确认删除"
        open={deleteModalOpen}
        onOk={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        confirmLoading={deleteMutation.isPending}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除该文档吗？删除后相关文件也将被删除，此操作不可恢复。</p>
      </Modal>

      {/* 对比检查模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>对比检查 - {compareMode === 'ocr' ? 'OCR 识别结果' : 'AI 规整结果'}</span>
            {document.files && document.files.length > 1 && (
              <Space size={4}>
                <Button
                  size="small"
                  icon={<LeftOutlined />}
                  disabled={compareFileIndex === 0}
                  onClick={() => setCompareFileIndex((i) => i - 1)}
                />
                <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                  {compareFileIndex + 1} / {document.files.length}
                </span>
                <Button
                  size="small"
                  icon={<RightOutlined />}
                  disabled={compareFileIndex === document.files.length - 1}
                  onClick={() => setCompareFileIndex((i) => i + 1)}
                />
              </Space>
            )}
          </div>
        }
        open={compareMode !== null}
        onCancel={() => setCompareMode(null)}
        footer={null}
        width="95vw"
        style={{ top: 20 }}
        styles={{ body: { height: '80vh', padding: 0, overflow: 'hidden' } }}
      >
        <div style={{ display: 'flex', height: '100%' }}>
          {/* 左侧：文件预览 */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              borderRight: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                flexShrink: 0,
              }}
            >
              {document.files?.[compareFileIndex]?.originalName || '文件预览'}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {document.files?.[compareFileIndex] &&
              isPdf(document.files[compareFileIndex].mimeType) ? (
                <iframe
                  src={document.files[compareFileIndex].url}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="PDF 预览"
                />
              ) : document.files?.[compareFileIndex] &&
                isImage(document.files[compareFileIndex].mimeType) ? (
                <div
                  style={{
                    padding: 16,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={document.files[compareFileIndex].url}
                    alt={document.files[compareFileIndex].originalName}
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--color-text-quaternary)',
                  }}
                >
                  该文件类型不支持预览
                </div>
              )}
            </div>
          </div>

          {/* 右侧：对比内容 */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                flexShrink: 0,
              }}
            >
              {compareMode === 'ocr' ? 'OCR 识别结果' : 'AI 规整结果'}
            </div>
            {compareMode === 'ocr' ? (
              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: 16,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {document.ocrText}
              </div>
            ) : (
              <div
                className="markdown-body"
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: 16,
                  lineHeight: 1.8,
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsedMarkdown}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentDetail;
