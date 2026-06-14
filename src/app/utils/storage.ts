// app/utils/storage.ts
const STORAGE_KEY = 'redbook_history';

// 定义记录的类型
interface HistoryRecord {
  id: number;
  style: string;
  category: string;
  keyword: string;
  content: string;
  createdAt: string;
}

// 保存记录
export const saveToHistory = (
  style: string, 
  category: string, 
  keyword: string, 
  content: string
): void => {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const history: HistoryRecord[] = existing ? JSON.parse(existing) : [];
    const newRecord: HistoryRecord = {
      id: Date.now(),
      style, 
      category, 
      keyword, 
      content,
      createdAt: new Date().toLocaleString()
    };
    // 最多保留20条
    const updated = [newRecord, ...history].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('保存失败:', error);
  }
};

// 读取历史记录
export const getHistory = (): HistoryRecord[] => {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('读取失败:', error);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

// 删除单条记录（可选功能）
export const deleteHistoryItem = (id: number): void => {
  try {
    const history = getHistory();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 清空所有历史（可选功能）
export const clearAllHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清空失败:', error);
  }
};