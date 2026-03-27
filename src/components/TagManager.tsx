import React, { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import { supabase } from '../lib/supabase';

interface TagFormData {
  name: string;
  color: string;
}

// 10种柔和的默认颜色（稍微加深）
const defaultColors = [
  '#FFCDD2', // 浅粉色（加深）
  '#B2EBF2', // 浅青色（加深）
  '#C8E6C9', // 浅绿色（加深）
  '#FFE0B2', // 浅橙色（加深）
  '#E1BEE7', // 浅紫色（加深）
  '#BBDEFB', // 浅蓝色（加深）
  '#FFF9C4', // 浅黄色（加深）
  '#CFD8DC', // 浅灰色（加深）
  '#FFAB91', // 浅珊瑚色（加深）
  '#A5D6A7'  // 浅薄荷色（加深）
];

const TagManager: React.FC = () => {
  const { state, dispatch } = useBudget();
  const [isAdding, setIsAdding] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    color: defaultColors[0]
  });

  // 处理添加标签
  const handleAddTag = async () => {
    if (formData.name.trim() && state.ledger) {
      try {
        // 提交到Supabase
        const { data, error } = await supabase
          .from('tags')
          .insert({
            ledger_id: state.ledger.id,
            name: formData.name.trim(),
            color: formData.color
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // 提交到本地状态
        dispatch({
          type: 'ADD_TAG',
          payload: data
        });
        setFormData({ name: '', color: defaultColors[0] });
        setIsAdding(false);
      } catch (error) {
        console.error('添加标签失败:', error);
        alert('添加标签失败，请重试');
      }
    }
  };

  // 处理编辑标签
  const handleEditTag = async () => {
    if (editingTag && formData.name.trim()) {
      try {
        // 提交到Supabase
        const { error } = await supabase
          .from('tags')
          .update({
            name: formData.name.trim(),
            color: formData.color
          })
          .eq('id', editingTag);

        if (error) {
          throw error;
        }

        // 提交到本地状态
        dispatch({
          type: 'UPDATE_TAG',
          payload: {
            id: editingTag,
            name: formData.name.trim(),
            color: formData.color,
            ledger_id: state.ledger?.id
          }
        });
        setFormData({ name: '', color: defaultColors[0] });
        setEditingTag(null);
      } catch (error) {
        console.error('编辑标签失败:', error);
        alert('编辑标签失败，请重试');
      }
    }
  };

  // 处理删除标签
  const handleDeleteTag = async (id: string) => {
    if (window.confirm('确定要删除这个标签吗？')) {
      try {
        // 从Supabase中删除
        const { error } = await supabase
          .from('tags')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }

        // 从本地状态中删除
        dispatch({ type: 'DELETE_TAG', payload: id });
      } catch (error) {
        console.error('删除标签失败:', error);
        alert('删除标签失败，请重试');
      }
    }
  };

  // 开始编辑标签
  const startEditTag = (id: string) => {
    const tag = state.tags.find(t => t.id === id);
    if (tag) {
      setFormData({ name: tag.name, color: tag.color });
      setEditingTag(id);
    }
  };

  // 取消添加/编辑
  const cancelAction = () => {
    setFormData({ name: '', color: defaultColors[0] });
    setIsAdding(false);
    setEditingTag(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg">
      <h2 className="text-xl font-bold mb-6 text-gray-800">标签管理</h2>
      
      {/* 标签列表 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {state.tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: tag.color }}>
            <div className="font-medium">{tag.name}</div>
            <div className="flex gap-1">
              <button
                onClick={() => startEditTag(tag.id)}
                className="text-gray-400 hover:text-blue-500 transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={() => handleDeleteTag(tag.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* 添加/编辑标签表单 */}
      {(isAdding || editingTag) && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-medium mb-3 text-gray-800">
            {editingTag ? '编辑标签' : '添加标签'}
          </h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="tag-name" className="block text-sm font-medium text-gray-700 mb-1">
                标签名称
              </label>
              <input
                type="text"
                id="tag-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                placeholder="请输入标签名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标签颜色
              </label>
              <div className="grid grid-cols-5 gap-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-full h-10 rounded-lg cursor-pointer transition-all duration-300 ${formData.color === color ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={editingTag ? handleEditTag : handleAddTag}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {editingTag ? '保存' : '添加'}
              </button>
              <button
                onClick={cancelAction}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 添加标签按钮 */}
      {!isAdding && !editingTag && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          添加标签
        </button>
      )}
    </div>
  );
};

export default TagManager;
