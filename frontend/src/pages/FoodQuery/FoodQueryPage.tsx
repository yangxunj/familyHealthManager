import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button,
  Select,
  Spin,
  Empty,
  Typography,
  message,
  Grid,
  Alert,
  Input,
} from 'antd';
import {
  CameraOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  PictureOutlined,
  CloseCircleFilled,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { chatApi, membersApi } from '../../api';
import { useElderModeStore } from '../../store';
import { resolveUploadUrl } from '../../lib/capacitor';
import type {
  ChatSession,
  ChatMessage,
  SSEMessageEvent,
} from '../../types';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const SESSION_TYPE = 'FOOD_QUERY' as const;
const AUTO_QUESTION = '请帮我看看这个食物能不能吃？';

// 预处理 Markdown：修复中文标点旁的加粗渲染问题
const preprocessMarkdown = (content: string): string => {
  const chinesePunctuation = /[\u201C\u201D\u2018\u2019\u300C\u300D\u300E\u300F\u3010\u3011\uFF08\uFF09]/;
  return content.replace(/\*\*([^*]+)\*\*/g, (match, inner) => {
    const firstChar = inner.charAt(0);
    const lastChar = inner.charAt(inner.length - 1);
    if (chinesePunctuation.test(firstChar) || chinesePunctuation.test(lastChar)) {
      return `<strong>${inner}</strong>`;
    }
    return match;
  });
};

const FoodQueryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isElderMode = useElderModeStore((s) => s.isElderMode);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 状态
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const fullResponseRef = useRef('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 获取家庭成员
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  // 自动选中唯一成员
  useEffect(() => {
    if (members?.length === 1 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  // 获取历史会话列表
  const PAGE_SIZE = 20;
  const {
    data: sessionsData,
    isLoading: isLoadingSessions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['food-query-sessions', selectedMemberId],
    queryFn: ({ pageParam = 0 }) =>
      chatApi.getSessions({
        limit: PAGE_SIZE,
        offset: pageParam,
        memberId: selectedMemberId,
        type: SESSION_TYPE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    enabled: !!selectedMemberId,
  });

  const sessions = sessionsData?.pages.flat();

  // 获取当前会话详情
  const { data: currentSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ['chat-session', activeSessionId],
    queryFn: () => chatApi.getSession(activeSessionId!),
    enabled: !!activeSessionId,
    refetchInterval: (query) => {
      return query.state.data?.title === '新对话' ? 3000 : false;
    },
  });

  // 同步远程消息到本地
  useEffect(() => {
    if (currentSession?.messages && !isStreaming) {
      setLocalMessages((prev) => {
        if (!prev || prev.length === 0) return currentSession.messages;
        if (currentSession.messages.length >= prev.length) return currentSession.messages;
        return prev;
      });
    }
  }, [currentSession?.messages, isStreaming]);

  // 标题更新时刷新会话列表
  useEffect(() => {
    if (currentSession?.title && currentSession.title !== '新对话') {
      queryClient.invalidateQueries({ queryKey: ['food-query-sessions'] });
    }
  }, [currentSession?.title, queryClient]);

  // 创建会话 mutation
  const createSessionMutation = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-query-sessions'] });
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 生成缩略图
  const createThumbnail = (file: File, maxSize = 128): Promise<string> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  };

  // 拍照/选择图片后的处理
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    if (!selectedMemberId) {
      message.warning('请先选择家庭成员');
      return;
    }

    // 如果当前在对话视图中，添加图片到 pending
    if (activeSessionId) {
      const remaining = 3 - pendingImages.length;
      const toAdd = files.slice(0, remaining);
      setPendingImages((prev) => [...prev, ...toAdd]);
      setImagePreviewUrls((prev) => [...prev, ...toAdd.map(() => '')]);
      const startIndex = pendingImages.length;
      toAdd.forEach((file, i) => {
        createThumbnail(file).then((thumbUrl) => {
          setImagePreviewUrls((prev) => {
            const next = [...prev];
            next[startIndex + i] = thumbUrl;
            return next;
          });
        });
      });
      return;
    }

    // 主页面：拍照后自动创建会话并发送
    const file = files[0];
    setUploading(true);
    try {
      // 上传图片
      const { url: uploadedUrl } = await chatApi.uploadChatImage(file);

      // 创建 FOOD_QUERY 会话
      const session = await createSessionMutation.mutateAsync({
        memberId: selectedMemberId,
        type: SESSION_TYPE,
      });

      // 进入对话视图
      setActiveSessionId(session.id);
      setLocalMessages([]);

      // 构建用户消息
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: AUTO_QUESTION,
        imageUrls: [uploadedUrl],
        createdAt: new Date().toISOString(),
      };
      setLocalMessages([userMessage]);
      setIsStreaming(true);
      setStreamingContent('');
      fullResponseRef.current = '';

      setTimeout(() => scrollToBottom(), 100);

      // 发送消息
      await chatApi.sendMessage(
        session.id,
        AUTO_QUESTION,
        (event) => {
          if ('tokensUsed' in event) {
            const fullText = fullResponseRef.current;
            if (fullText) {
              const aiMessage: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: fullText,
                createdAt: new Date().toISOString(),
              };
              setLocalMessages((prev) => [...(prev || []), aiMessage]);
            }
            setIsStreaming(false);
            setStreamingContent('');
            fullResponseRef.current = '';
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['chat-session', session.id] });
              queryClient.invalidateQueries({ queryKey: ['food-query-sessions'] });
            }, 300);
          } else {
            const msgEvent = event as SSEMessageEvent;
            if (!msgEvent.done) {
              fullResponseRef.current += msgEvent.content;
              setStreamingContent(fullResponseRef.current);
            }
          }
        },
        (error) => {
          message.error(error);
          setIsStreaming(false);
          fullResponseRef.current = '';
        },
        [uploadedUrl],
      );
    } catch (error) {
      console.error('[FoodQuery] 拍照流程失败:', error);
      message.error('操作失败，请重试');
      setIsStreaming(false);
      fullResponseRef.current = '';
    } finally {
      setUploading(false);
    }
  };

  // 在对话视图中发送追问消息
  const handleSend = async (messageContent?: string) => {
    const content = messageContent || inputValue.trim();
    if ((!content && pendingImages.length === 0) || isStreaming || !activeSessionId) return;

    // 上传图片
    let uploadedUrls: string[] = [];
    if (pendingImages.length > 0) {
      setUploading(true);
      try {
        uploadedUrls = await Promise.all(
          pendingImages.map((f) => chatApi.uploadChatImage(f).then((r) => r.url)),
        );
      } catch {
        message.error('图片上传失败');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content || '(图片)',
      imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      createdAt: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...(prev || []), userMessage]);
    if (!messageContent) setInputValue('');
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPendingImages([]);
    setImagePreviewUrls([]);
    setIsStreaming(true);
    setStreamingContent('');
    fullResponseRef.current = '';

    setTimeout(() => scrollToBottom(), 100);

    try {
      await chatApi.sendMessage(
        activeSessionId,
        userMessage.content,
        (event) => {
          if ('tokensUsed' in event) {
            const fullText = fullResponseRef.current;
            if (fullText) {
              const aiMessage: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: fullText,
                createdAt: new Date().toISOString(),
              };
              setLocalMessages((prev) => [...(prev || []), aiMessage]);
            }
            setIsStreaming(false);
            setStreamingContent('');
            fullResponseRef.current = '';
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['chat-session', activeSessionId] });
              queryClient.invalidateQueries({ queryKey: ['food-query-sessions'] });
            }, 300);
          } else {
            const msgEvent = event as SSEMessageEvent;
            if (!msgEvent.done) {
              fullResponseRef.current += msgEvent.content;
              setStreamingContent(fullResponseRef.current);
            }
          }
        },
        (error) => {
          message.error(error);
          setIsStreaming(false);
          fullResponseRef.current = '';
        },
        uploadedUrls.length > 0 ? uploadedUrls : undefined,
      );
    } catch (error) {
      console.error('[FoodQuery] 发送消息失败:', error);
      message.error('发送消息失败');
      setIsStreaming(false);
      fullResponseRef.current = '';
    }
  };

  // 移除待上传图片
  const handleRemoveImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // 选图（对话视图中追问时用）
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = 3 - pendingImages.length;
    const toAdd = files.slice(0, remaining);
    setPendingImages((prev) => [...prev, ...toAdd]);
    setImagePreviewUrls((prev) => [...prev, ...toAdd.map(() => '')]);
    e.target.value = '';
    const startIndex = pendingImages.length;
    toAdd.forEach((file, i) => {
      createThumbnail(file).then((thumbUrl) => {
        setImagePreviewUrls((prev) => {
          const next = [...prev];
          next[startIndex + i] = thumbUrl;
          return next;
        });
      });
    });
  };

  // 返回主页面
  const handleBack = () => {
    setActiveSessionId(null);
    setLocalMessages(undefined);
    setPendingImages([]);
    setImagePreviewUrls([]);
    setInputValue('');
  };

  // 消息气泡样式
  const msgFontSize = isElderMode ? 17 : (isMobile ? 14 : undefined);
  const msgLineHeight = isElderMode ? 1.8 : 1.6;
  const msgPadding = isElderMode ? '12px 16px' : (isMobile ? '8px 12px' : '10px 14px');

  // 渲染消息
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            maxWidth: isMobile ? '90%' : '80%',
          }}
        >
          <div
            style={{
              width: isMobile ? 30 : 36,
              height: isMobile ? 30 : 36,
              borderRadius: '50%',
              backgroundColor: isUser ? '#136dec' : '#13ec5b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              fontSize: isMobile ? 12 : 14,
              margin: isUser ? '0 0 0 8px' : '0 8px 0 0',
            }}
          >
            {isUser ? <UserOutlined /> : <RobotOutlined />}
          </div>
          <div
            style={{
              backgroundColor: isUser ? '#136dec' : 'var(--color-bg-chat-ai)',
              color: isUser ? '#fff' : 'var(--color-text-primary)',
              padding: msgPadding,
              borderRadius: 16,
              borderTopLeftRadius: isUser ? 16 : 4,
              borderTopRightRadius: isUser ? 4 : 16,
              wordBreak: 'break-word',
              fontSize: msgFontSize,
              lineHeight: msgLineHeight,
            }}
            className={isUser ? undefined : 'markdown-content'}
          >
            {isUser ? (
              <>
                {msg.imageUrls && msg.imageUrls.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: msg.content && msg.content !== '(图片)' ? 8 : 0 }}>
                    {msg.imageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={resolveUploadUrl(url)}
                        alt={`图片${i + 1}`}
                        style={{
                          maxWidth: isMobile ? 160 : 200,
                          maxHeight: isMobile ? 160 : 200,
                          borderRadius: 8,
                          cursor: 'pointer',
                          objectFit: 'cover',
                        }}
                        onClick={() => window.open(resolveUploadUrl(url), '_blank')}
                      />
                    ))}
                  </div>
                )}
                {msg.content && msg.content !== '(图片)' && (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                )}
              </>
            ) : (
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{preprocessMarkdown(msg.content)}</Markdown>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染流式消息
  const renderStreamingMessage = () => {
    if (!isStreaming) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', maxWidth: isMobile ? '90%' : '80%' }}>
          <div
            style={{
              width: isMobile ? 30 : 36,
              height: isMobile ? 30 : 36,
              borderRadius: '50%',
              backgroundColor: '#13ec5b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              fontSize: isMobile ? 12 : 14,
              marginRight: 8,
            }}
          >
            <RobotOutlined />
          </div>
          <div
            style={{
              backgroundColor: 'var(--color-bg-chat-ai)',
              color: 'var(--color-text-primary)',
              padding: isElderMode ? '12px 16px' : (isMobile ? '8px 12px' : '12px 16px'),
              borderRadius: 12,
              borderTopLeftRadius: 4,
              wordBreak: 'break-word',
              minWidth: 60,
              fontSize: msgFontSize,
              lineHeight: msgLineHeight,
            }}
            className="markdown-content"
          >
            {streamingContent ? (
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{preprocessMarkdown(streamingContent)}</Markdown>
            ) : (
              <>
                <Spin size="small" />
                <span style={{ marginLeft: 8, color: 'var(--color-text-secondary)' }}>AI 正在分析食物...</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ========== 对话视图 ==========
  if (activeSessionId) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-bg-container)',
          margin: isElderMode ? -8 : (isMobile ? -12 : 0),
        }}
      >
        {/* 顶部栏 */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--color-bg-container)',
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            style={{ padding: '4px 8px' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong ellipsis style={{ display: 'block', fontSize: 15 }}>
              {currentSession?.title || '食物分析中...'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {currentSession?.member?.name}
            </Text>
          </div>
        </div>

        {/* 消息列表 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: isMobile ? '12px 12px' : '16px 24px',
          }}
        >
          <Alert
            message="AI 食物建议仅供参考，具体饮食方案请遵医嘱。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            closable
          />
          {isLoadingSession && !localMessages?.length ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : (
            <>
              {localMessages?.map(renderMessage)}
              {renderStreamingMessage()}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区（追问） */}
        <div
          style={{
            padding: isMobile ? '10px 12px' : '16px 24px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            flexShrink: 0,
          }}
        >
          {/* 图片预览 */}
          {imagePreviewUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {imagePreviewUrls.map((url, i) => (
                <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  {url ? (
                    <img
                      src={url}
                      alt={`预览${i + 1}`}
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }}
                    />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 8, border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-elevated)' }}>
                      <Spin size="small" />
                    </div>
                  )}
                  <CloseCircleFilled
                    onClick={() => handleRemoveImage(i)}
                    style={{ position: 'absolute', top: -6, right: -6, fontSize: 18, color: '#ff4d4f', cursor: 'pointer', background: '#fff', borderRadius: '50%' }}
                  />
                </div>
              ))}
            </div>
          )}
          {/* 隐藏的文件选择器 */}
          <input ref={imageInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageCapture} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Button
              type="text"
              icon={<PictureOutlined />}
              disabled={isStreaming || uploading || pendingImages.length >= 3}
              onClick={() => imageInputRef.current?.click()}
              style={{ flexShrink: 0, padding: '4px 8px' }}
            />
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="继续追问..."
              autoSize={{ minRows: 1, maxRows: isMobile ? 3 : 4 }}
              disabled={isStreaming}
              style={{ flex: 1, ...(isElderMode ? { fontSize: 17 } : {}) }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleSend()}
              loading={isStreaming || uploading}
              disabled={!inputValue.trim() && pendingImages.length === 0}
              style={isMobile ? { padding: '0 12px' } : undefined}
            >
              {isMobile ? '' : '发送'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ========== 主页面（无活跃会话）==========
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        margin: isElderMode ? -8 : (isMobile ? -12 : 0),
        padding: isMobile ? 16 : 24,
        overflow: 'auto',
      }}
    >
      {/* 隐藏的文件选择器 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleImageCapture}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageCapture}
      />

      {/* 成员选择器 */}
      {members && members.length > 1 && (
        <div style={{ marginBottom: 20, flexShrink: 0 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: isElderMode ? 16 : 14 }}>
            选择查询的家庭成员：
          </Text>
          {isElderMode ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {members.map((member) => (
                <Button
                  key={member.id}
                  type={selectedMemberId === member.id ? 'primary' : 'default'}
                  size="large"
                  style={{
                    borderRadius: 20,
                    minWidth: 80,
                    fontSize: 16,
                    height: 44,
                    ...(selectedMemberId !== member.id ? { borderColor: 'var(--color-border)' } : {}),
                  }}
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  {member.name}
                </Button>
              ))}
            </div>
          ) : (
            <Select
              placeholder="选择家庭成员"
              style={{ width: '100%', maxWidth: 300 }}
              value={selectedMemberId}
              onChange={setSelectedMemberId}
            >
              {members.map((member) => (
                <Select.Option key={member.id} value={member.id}>
                  {member.name}
                </Select.Option>
              ))}
            </Select>
          )}
        </div>
      )}

      {/* 拍照大按钮 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: isMobile ? '24px 0' : '40px 0',
          flexShrink: 0,
        }}
      >
        <div
          onClick={() => {
            if (!selectedMemberId) {
              message.warning('请先选择家庭成员');
              return;
            }
            if (uploading) return;
            cameraInputRef.current?.click();
          }}
          style={{
            width: isMobile ? 120 : 140,
            height: isMobile ? 120 : 140,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #136dec 0%, #36a3ff 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            boxShadow: '0 8px 24px rgba(19, 109, 236, 0.35)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            opacity: !selectedMemberId ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (selectedMemberId && !uploading) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(19, 109, 236, 0.45)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(19, 109, 236, 0.35)';
          }}
        >
          {uploading ? (
            <Spin size="large" style={{ color: '#fff' }} />
          ) : (
            <>
              <CameraOutlined style={{ fontSize: isMobile ? 36 : 44, color: '#fff' }} />
              <span style={{ color: '#fff', fontSize: isMobile ? 15 : 16, fontWeight: 600, marginTop: 8 }}>
                开始拍照
              </span>
            </>
          )}
        </div>
        <Text type="secondary" style={{ marginTop: 12, fontSize: isElderMode ? 16 : 14 }}>
          拍一拍，问一问能不能吃
        </Text>
        {/* 额外的选择本地图片按钮 */}
        <Button
          type="link"
          icon={<PictureOutlined />}
          onClick={() => {
            if (!selectedMemberId) {
              message.warning('请先选择家庭成员');
              return;
            }
            imageInputRef.current?.click();
          }}
          disabled={uploading}
          style={{ marginTop: 8, fontSize: isElderMode ? 15 : 13 }}
        >
          从相册选择
        </Button>
      </div>

      {/* 历史记录 */}
      {selectedMemberId && (
        <div style={{ flexShrink: 0 }}>
          <Text
            strong
            style={{
              display: 'block',
              marginBottom: 12,
              fontSize: isElderMode ? 18 : 16,
            }}
          >
            历史查询
          </Text>
          {isLoadingSessions ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin />
            </div>
          ) : sessions && sessions.length > 0 ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 130 : 150}px, 1fr))`,
                  gap: 12,
                }}
              >
                {sessions.map((session: ChatSession) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setLocalMessages(undefined);
                    }}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-elevated)',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px var(--color-shadow)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* 食物缩略图 */}
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        background: 'var(--color-bg-layout)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {session.firstImageUrl ? (
                        <img
                          src={resolveUploadUrl(session.firstImageUrl)}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <CameraOutlined style={{ fontSize: 32, color: 'var(--color-text-quaternary)' }} />
                      )}
                    </div>
                    {/* 信息 */}
                    <div style={{ padding: '8px 10px' }}>
                      <div
                        style={{
                          fontSize: isElderMode ? 15 : 13,
                          fontWeight: 500,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.3',
                          minHeight: '2.6em',
                        }}
                      >
                        {session.title === '新对话' ? '食物查询' : session.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                        {dayjs(session.createdAt).format('MM-DD HH:mm')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* 加载更多 */}
              {(isFetchingNextPage || hasNextPage) && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  {isFetchingNextPage ? (
                    <Spin size="small" />
                  ) : hasNextPage ? (
                    <Button type="link" onClick={() => fetchNextPage()}>
                      加载更多
                    </Button>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <Empty
              description="还没有查询记录"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '20px 0' }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FoodQueryPage;
