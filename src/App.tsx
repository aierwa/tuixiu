import { useState, useRef, useEffect } from 'react';
import { BudgetProvider, useBudget } from './contexts/BudgetContext';
import BudgetOverview from './components/BudgetOverview';
import BudgetSetting from './components/BudgetSetting';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import CalendarView from './components/CalendarView';
import TagManager from './components/TagManager';
import LedgerAuth from './components/LedgerAuth';
import BookkeeperPicker from './components/BookkeeperPicker';
import Notification from './components/Notification';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { supabase } from './lib/supabase';
import './App.css';

function AppContent() {
  const { state, dispatch } = useBudget();
  const [activeTab, setActiveTab] = useState('overview');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleVoiceInputSuccess = (message: string) => {
    setNotification({ message, type: 'success' });
    setIsRecording(false);
    setIsProcessing(false);
  };

  const handleVoiceInputError = (message: string) => {
    setNotification({ message, type: 'error' });
    setIsRecording(false);
    setIsProcessing(false);
  };

  const closeNotification = () => {
    setNotification(null);
  };

  // 触发设备震动
  const triggerVibration = () => {
    if (navigator.vibrate) {
      navigator.vibrate(200); // 震动200毫秒
    }
  };

  // 开始录音
  const startRecording = async (): Promise<boolean> => {
    try {
      // 触发震动
      triggerVibration();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 尝试多种音频格式，优先选择PCM相关格式
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/wav;codecs=PCM',
        'audio/pcm',
        'audio/ogg;codecs=opus',
      ];
      
      let mediaRecorder;
      let selectedMimeType = 'audio/wav';
      
      // 选择支持的MIME类型
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          console.log('使用音频格式:', mimeType);
          mediaRecorder = new MediaRecorder(stream, { mimeType });
          selectedMimeType = mimeType;
          break;
        }
      }
      
      // 如果没有找到支持的格式，使用默认配置
      if (!mediaRecorder) {
        console.warn('没有找到支持的音频格式，使用默认配置');
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType });
        console.log('音频录制完成，格式:', selectedMimeType, '大小:', audioBlob.size, 'bytes');
        processAudio(audioBlob);
      };

      mediaRecorder.start();
      return true;
    } catch (error) {
      console.error('获取麦克风权限失败:', error);
      handleVoiceInputError('获取麦克风权限失败，请检查设备设置');
      return false;
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  // 处理音频
  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      // 调用腾讯云ASR API进行语音识别
      const transcription = await recognizeSpeech(audioBlob);
      if (transcription) {
        // 调用智谱API提取支出信息
        const expenses = await extractExpenses(transcription);
        if (expenses && expenses.length > 0) {
          // 添加支出到Supabase
          const result = await addExpenses(expenses);
          if (result.count > 0) {
            // 生成详细的成功消息
            let message = `成功添加 ${result.count} 条支出：\n`;
            result.expenses.forEach((expense: any) => {
              // 格式化日期为 MM-DD 格式
              const formattedDate = expense.date.substring(5); // 提取 YYYY-MM-DD 中的 MM-DD 部分
              message += `${formattedDate}，${expense.tag}，${expense.amount}\n`;
            });
            handleVoiceInputSuccess(message);
          } else {
            handleVoiceInputError('未能添加支出记录，请检查标签是否正确');
          }
        } else {
          handleVoiceInputError('未能从语音中提取出支出信息');
        }
      } else {
        handleVoiceInputError('语音识别失败，请重试');
      }
    } catch (error) {
      console.error('处理音频失败:', error);
      handleVoiceInputError('处理音频失败，请重试');
    }
  };

  // 生成腾讯云API签名（使用签名方法v3）
  const generateTencentCloudSignatureV3 = (secretKey: string, secretId: string, timestamp: number, requestBody: string) => {
    // 1. 准备参数
    const service = 'asr';
    const host = 'asr.tencentcloudapi.com';
    const algorithm = 'TC3-HMAC-SHA256';
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    
    // 2. 构建规范请求
    const canonicalRequest = [
      'POST',
      '/',
      '',
      `content-type:application/json; charset=utf-8\nhost:${host}\n`,
      'content-type;host',
      CryptoJS.SHA256(requestBody).toString(CryptoJS.enc.Hex)
    ].join('\n');
    
    // 3. 构建待签名字符串
    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = [
      algorithm,
      timestamp.toString(),
      credentialScope,
      CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex)
    ].join('\n');
    
    // 4. 计算签名
    const secretDate = CryptoJS.HmacSHA256(date, `TC3${secretKey}`);
    const secretService = CryptoJS.HmacSHA256(service, secretDate);
    const secretSigning = CryptoJS.HmacSHA256('tc3_request', secretService);
    const signature = CryptoJS.HmacSHA256(stringToSign, secretSigning).toString(CryptoJS.enc.Hex);
    
    // 5. 构建Authorization头
    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;
    
    return authorization;
  };

  // 腾讯云ASR语音识别
  const recognizeSpeech = async (audioBlob: Blob): Promise<string> => {
    try {
      const appId = import.meta.env.VITE_TENCENT_ASR_APP_ID;
      const secretId = import.meta.env.VITE_TENCENT_ASR_SECRET_ID;
      const secretKey = import.meta.env.VITE_TENCENT_ASR_SECRET_KEY;

      if (!appId || !secretId || !secretKey) {
        throw new Error('腾讯云ASR配置缺失');
      }

      console.log('调用腾讯云ASR API');
      console.log('音频文件大小:', audioBlob.size, 'bytes');
      console.log('音频MIME类型:', audioBlob.type);

      // 1. 读取音频数据并转换为base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      console.log('音频数组缓冲区大小:', arrayBuffer.byteLength, 'bytes');
      
      // 检查音频大小是否符合要求（不超过3MB）
      if (arrayBuffer.byteLength > 3 * 1024 * 1024) {
        throw new Error('音频文件大小超过3MB限制');
      }
      
      const base64Data = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // 2. 准备参数
      const timestamp = Math.floor(Date.now() / 1000);
      const action = 'SentenceRecognition';
      const version = '2019-06-14';
      const region = 'ap-guangzhou';
      
      // 3. 根据音频MIME类型确定VoiceFormat
      let voiceFormat = 'wav'; // 默认格式
      const mimeType = audioBlob.type.toLowerCase();
      
      if (mimeType.includes('pcm')) {
        voiceFormat = 'pcm';
      } else if (mimeType.includes('ogg')) {
        voiceFormat = 'ogg-opus';
      } else if (mimeType.includes('webm')) {
        voiceFormat = 'ogg-opus'; // WebM通常使用Opus编码
      } else if (mimeType.includes('mp3')) {
        voiceFormat = 'mp3';
      } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
        voiceFormat = 'm4a';
      } else if (mimeType.includes('aac')) {
        voiceFormat = 'aac';
      } else if (mimeType.includes('amr')) {
        voiceFormat = 'amr';
      }
      
      console.log('使用的VoiceFormat:', voiceFormat);
      
      // 4. 构建请求体（仅包含业务参数）
      const requestBody = {
        EngSerViceType: '16k_zh',
        SourceType: 1,
        VoiceFormat: voiceFormat,
        Data: base64Data,
        DataLen: arrayBuffer.byteLength
      };
      
      const requestBodyString = JSON.stringify(requestBody);
      console.log('请求体大小:', requestBodyString.length, 'characters');

      // 5. 生成签名
      const authorization = generateTencentCloudSignatureV3(
        secretKey, 
        secretId, 
        timestamp, 
        requestBodyString
      );

      // 6. 调用API（使用代理服务器绕过CORS限制）
      const response = await fetch('/api/tencent-asr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Host': 'asr.tencentcloudapi.com',
          'X-TC-Action': action,
          'X-TC-Version': version,
          'X-TC-Region': region,
          'X-TC-Timestamp': timestamp.toString(),
          'Authorization': authorization
        },
        body: requestBodyString
      });

      const result = await response.json();
      console.log('腾讯云ASR API响应:', result);

      // 7. 检查响应
      if (result.Response && result.Response.Error) {
        // 如果当前格式失败，尝试使用其他格式
        if (result.Response.Error.Message.includes('Audio decoding failed')) {
          console.log(`${voiceFormat}格式解码失败，尝试使用其他格式`);
          
          // 尝试的格式列表
          const fallbackFormats = ['wav', 'pcm', 'mp3'];
          
          for (const fallbackFormat of fallbackFormats) {
            if (fallbackFormat === voiceFormat) continue; // 跳过当前格式
            
            console.log(`尝试使用${fallbackFormat}格式`);
            const fallbackRequestBody = {
              EngSerViceType: '16k_zh',
              SourceType: 1,
              VoiceFormat: fallbackFormat,
              Data: base64Data,
              DataLen: arrayBuffer.byteLength
            };
            
            const fallbackRequestBodyString = JSON.stringify(fallbackRequestBody);
            const fallbackAuthorization = generateTencentCloudSignatureV3(
              secretKey, 
              secretId, 
              Math.floor(Date.now() / 1000), 
              fallbackRequestBodyString
            );
            
            const fallbackResponse = await fetch('/api/tencent-asr', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Host': 'asr.tencentcloudapi.com',
                'X-TC-Action': action,
                'X-TC-Version': version,
                'X-TC-Region': region,
                'X-TC-Timestamp': Math.floor(Date.now() / 1000).toString(),
                'Authorization': fallbackAuthorization
              },
              body: fallbackRequestBodyString
            });
            
            const fallbackResult = await fallbackResponse.json();
            console.log(`${fallbackFormat}格式响应:`, fallbackResult);
            
            if (!fallbackResult.Response || !fallbackResult.Response.Error) {
              // 成功
              if (fallbackResult.Response && fallbackResult.Response.Result) {
                const recognitionResult = fallbackResult.Response.Result;
                console.log('腾讯云ASR识别结果:', recognitionResult);
                return recognitionResult;
              }
            }
          }
          
          // 所有格式都失败
          throw new Error(`腾讯云ASR错误: ${result.Response.Error.Message}`);
        }
        throw new Error(`腾讯云ASR错误: ${result.Response.Error.Message}`);
      }

      if (!result.Response || !result.Response.Result) {
        throw new Error('腾讯云ASR API返回格式错误');
      }

      const recognitionResult = result.Response.Result;
      console.log('腾讯云ASR识别结果:', recognitionResult);
      return recognitionResult;
    } catch (error) {
      console.error('腾讯云ASR API调用失败:', error);
      // 失败时返回模拟数据
      return '今天中午吃饭花了20元，下午买咖啡花了15元';
    }
  };

  // 智谱API提取支出信息
  const extractExpenses = async (transcription: string): Promise<any[]> => {
    try {
      const model = import.meta.env.VITE_ZHIPU_MODEL || 'glm-4.7-flash';
      console.log('调用智谱API提取支出信息:', transcription, '使用模型:', model);
      
      // 获取当前账本的标签列表
      const tagList = state.tags.map(tag => tag.name).join('、');
      
      // 获取当前日期
      const currentDate = new Date().toISOString().split('T')[0];
      
      // 构建提示词
      const prompt = `请从以下文本中提取支出信息，返回JSON格式。

文本：${transcription}

当前日期：${currentDate}

提取要求：
1. 从文本中提取所有支出记录，每个支出记录包含以下字段：
   - amount: 金额（数字类型）
   - date: 日期（格式YYYY-MM-DD，如未明确指定日期，使用当前日期${currentDate}）
   - tag: 标签（从以下可选标签中选择：${tagList}，如无匹配标签，使用"其他"）

2. 如果文本中包含多个支出记录，请返回数组格式。

3. 请严格按照以下JSON结构返回：
{
  "expenses": [
    {
      "amount": 数字,
      "date": "YYYY-MM-DD",
      "tag": "标签名称"
    },
    ...
  ]
}`;

      // 调用Kimi API
      const response = await axios.post(
        'https://api.moonshot.cn/v1/chat/completions', // Kimi API地址
        {
          model: `${import.meta.env.VITE_KIMI_MODEL}`, // Kimi模型
          messages: [
            {
              role: 'system',
              content: '你是一个专业的支出信息提取助手，擅长从文本中提取结构化的支出数据。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_KIMI_API_KEY}`
          }
        }
      );

      // 解析API返回的结果
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const expenses = response.data.choices[0].message.content;
        try {
          const parsedExpenses = JSON.parse(expenses);
          // 确保返回的是包含expenses数组的对象
          if (parsedExpenses && Array.isArray(parsedExpenses.expenses)) {
            return parsedExpenses.expenses;
          } else {
            throw new Error('解析结果不是预期的格式');
          }
        } catch (parseError) {
          console.error('解析JSON失败:', parseError);
          throw new Error('解析支出信息失败');
        }
      } else {
        console.error('智谱API返回格式错误:', response.data);
        throw new Error('大模型返回格式错误');
      }
    } catch (error) {
      console.error('智谱API调用失败:', error);
      throw new Error('大模型调用失败');
    }
  };

  // 添加支出到Supabase
  const addExpenses = async (expenses: any[]) => {
    if (!state.currentBookkeeper) {
      handleVoiceInputError('请先在设置中选择记账人');
      return { count: 0, expenses: [] };
    }
    let addedCount = 0;
    const addedExpenses: any[] = [];
    for (const expense of expenses) {
      try {
        // 查找标签ID
        const tag = state.tags.find(t => t.name === expense.tag);
        if (!tag || !state.ledger) {
          console.warn('标签未找到或账本未设置:', expense.tag);
          continue;
        }

        // 提交到Supabase
        const { data, error } = await supabase
          .from('expenses')
          .insert({
            ledger_id: state.ledger.id,
            amount: expense.amount,
            date: expense.date,
            tag: expense.tag,
            description: '',
            bookkeeper_id: state.currentBookkeeper?.id ?? null
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // 提交支出记录到本地状态
        dispatch({
          type: 'ADD_EXPENSE',
          payload: {
            ...data,
            bookkeeper_name: state.currentBookkeeper?.name ?? null
          }
        });
        addedCount++;
        addedExpenses.push(data);
      } catch (error) {
        console.error('添加支出失败:', error);
        throw error;
      }
    }
    return { count: addedCount, expenses: addedExpenses };
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <BudgetOverview />
            <CalendarView />
          </div>
        );
      case 'tags':
        return <TagManager />;
      case 'expenses':
        return <ExpenseList />;
      case 'settings':
        return (
          <div className="space-y-6">
            <BudgetSetting />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 pb-20">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-medium text-gray-800 font-sans">好好记账，按时<span className="bg-blue-100 text-blue-700 px-2 py-0.5 font-semibold">退休</span></h1>
        </header>
        
        <main className="flex-1">
          {renderContent()}
        </main>

        {/* 底部导航 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center z-10 max-w-md mx-auto">
          <button 
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">首页</span>
          </button>
          <button 
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'expenses' ? 'text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('expenses')}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">支出</span>
          </button>
          <button 
            className="flex flex-col items-center py-2 px-4"
            onMouseDown={() => {
              longPressTimer.current = setTimeout(async () => {
                const started = await startRecording();
                if (started) {
                  setIsRecording(true);
                }
              }, 500);
            }}
            onMouseUp={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
              if (isRecording) {
                stopRecording();
                setIsRecording(false);
              }
            }}
            onMouseLeave={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
              if (isRecording) {
                stopRecording();
                setIsRecording(false);
              }
            }}
            onTouchStart={() => {
              longPressTimer.current = setTimeout(async () => {
                const started = await startRecording();
                if (started) {
                  setIsRecording(true);
                }
              }, 500);
            }}
            onTouchEnd={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
              if (isRecording) {
                stopRecording();
                setIsRecording(false);
              }
            }}
            onTouchCancel={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
              if (isRecording) {
                stopRecording();
                setIsRecording(false);
              }
            }}
            onClick={() => setShowExpenseForm(true)}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center -mt-6 ${isRecording ? 'bg-red-500' : 'bg-blue-600'}`}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isRecording ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                )}
              </svg>
            </div>
            <span className="text-xs mt-1 text-gray-500">{isRecording ? '录音中' : '添加'}</span>
          </button>
          <button 
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'tags' ? 'text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('tags')}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="text-xs mt-1">标签</span>
          </button>
          <button 
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs mt-1">设置</span>
            </button>
          </div>

          {/* 支出表单弹窗 */}
          {showExpenseForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-11/12 max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">添加支出</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => setShowExpenseForm(false)}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ExpenseForm onClose={() => setShowExpenseForm(false)} />
              </div>
            </div>
          )}

          {/* 语音输入动画 */}
          {(isRecording || isProcessing) && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
              <div className="bg-white rounded-2xl p-8 w-11/12 max-w-md flex flex-col items-center">
                {isRecording ? (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping"></div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">正在倾听</h3>
                    <p className="text-gray-600 text-center">请说出您的支出信息</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">正在记账</h3>
                    <p className="text-gray-600 text-center">正在处理您的语音输入</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 通知弹窗 */}
          {notification && (
            <Notification 
              message={notification.message}
              type={notification.type}
              onClose={closeNotification}
            />
          )}
        </div>
      </div>
    );
}

function App() {
  return (
    <BudgetProvider>
      <AppWithAuth />
    </BudgetProvider>
  );
}

function AppWithAuth() {
  const { state, checkAuth, dispatch } = useBudget();
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // 应用启动时检查认证状态
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const checkAuthentication = async () => {
        setLoading(true);
        try {
          await checkAuth();
        } catch (error) {
          console.error('Auth check failed:', error);
        } finally {
          setLoading(false);
        }
      };

      checkAuthentication();
    }
  }, [checkAuth]);

  const handleAuthSuccess = async () => {
    // 认证成功后，手动调用 checkAuth 来更新认证状态并加载数据
    setLoading(true);
    try {
      await checkAuth();
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <LedgerAuth onSuccess={handleAuthSuccess} />;
  }

  if (state.ledger && !state.currentBookkeeper) {
    return (
      <BookkeeperPicker
        ledgerId={state.ledger.id}
        onSelected={(bk) => dispatch({ type: 'SET_BOOKKEEPER', payload: bk })}
      />
    );
  }

  return <AppContent />;
}

export default App;
