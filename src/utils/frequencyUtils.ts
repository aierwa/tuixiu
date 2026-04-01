// 高频填写记录类型
export interface FrequencyRecord {
  tagId: string;
  tagName: string;
  tagColor: string;
  amount: number;
  count: number;
  lastUsed: number; // 时间戳
}

// 保存高频填写记录到本地存储
export const saveFrequencyRecords = (records: FrequencyRecord[]): void => {
  try {
    localStorage.setItem('budget-app-frequency-records', JSON.stringify(records));
  } catch (error) {
    console.error('保存高频记录失败:', error);
  }
};

// 从本地存储获取高频填写记录
export const getFrequencyRecords = (): FrequencyRecord[] => {
  try {
    const records = localStorage.getItem('budget-app-frequency-records');
    return records ? JSON.parse(records) : [];
  } catch (error) {
    console.error('获取高频记录失败:', error);
    return [];
  }
};

// 添加或更新高频填写记录
export const addFrequencyRecord = (tagId: string, tagName: string, tagColor: string, amount: number): FrequencyRecord[] => {
  const records = getFrequencyRecords();
  
  // 查找是否已存在相同的标签和金额组合
  const existingIndex = records.findIndex(
    record => record.tagId === tagId && record.amount === amount
  );
  
  if (existingIndex >= 0) {
    // 更新现有记录
    records[existingIndex] = {
      ...records[existingIndex],
      count: records[existingIndex].count + 1,
      lastUsed: Date.now()
    };
  } else {
    // 添加新记录
    records.push({
      tagId,
      tagName,
      tagColor,
      amount,
      count: 1,
      lastUsed: Date.now()
    });
  }
  
  // 按使用次数和最后使用时间排序
  records.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count; // 优先按使用次数降序
    }
    return b.lastUsed - a.lastUsed; // 其次按最后使用时间降序
  });
  
  // 只保留前3个记录
  const topRecords = records.slice(0, 3);
  
  // 保存到本地存储
  saveFrequencyRecords(topRecords);
  
  return topRecords;
};

// 获取前3个高频填写记录
export const getTopFrequencyRecords = (): FrequencyRecord[] => {
  const records = getFrequencyRecords();
  return records.slice(0, 3);
};