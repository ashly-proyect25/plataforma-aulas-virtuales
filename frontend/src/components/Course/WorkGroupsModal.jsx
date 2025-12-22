// frontend/src/components/Course/WorkGroupsModal.jsx

import { useState, useEffect } from 'react';
import { X, Users, Plus, Trash2, Save, Shuffle, User, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const WorkGroupsModal = ({ isOpen, onClose, course, students }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupCount, setGroupCount] = useState(3);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen, course?.id]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${course.id}/groups`);
      if (response.data.groups && response.data.groups.length > 0) {
        setGroups(response.data.groups);
      } else {
        // Inicializar con grupos vacíos
        setGroups([
          { id: null, name: 'Grupo 1', students: [] },
          { id: null, name: 'Grupo 2', students: [] },
          { id: null, name: 'Grupo 3', students: [] }
        ]);
      }
    } catch (err) {
      console.error('Error al cargar grupos:', err);
      // Inicializar con grupos vacíos si hay error
      setGroups([
        { id: null, name: 'Grupo 1', students: [] },
        { id: null, name: 'Grupo 2', students: [] },
        { id: null, name: 'Grupo 3', students: [] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addGroup = () => {
    const newGroupNumber = groups.length + 1;
    setGroups([...groups, {
      id: null,
      name: `Grupo ${newGroupNumber}`,
      students: []
    }]);
  };

  const removeGroup = (index) => {
    if (groups.length <= 1) {
      setError('Debe haber al menos un grupo');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const newGroups = groups.filter((_, i) => i !== index);
    setGroups(newGroups);
  };

  const updateGroupName = (index, newName) => {
    const newGroups = [...groups];
    newGroups[index].name = newName;
    setGroups(newGroups);
  };

  const toggleStudentInGroup = (groupIndex, student) => {
    const newGroups = [...groups];

    // Remover estudiante de cualquier otro grupo
    newGroups.forEach(group => {
      group.students = group.students.filter(s => s.id !== student.id);
    });

    // Agregar o remover del grupo seleccionado
    const studentInGroup = newGroups[groupIndex].students.find(s => s.id === student.id);
    if (!studentInGroup) {
      newGroups[groupIndex].students.push(student);
    }

    setGroups(newGroups);
  };

  const distributeRandomly = () => {
    if (students.length === 0) {
      setError('No hay estudiantes para distribuir');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Mezclar estudiantes aleatoriamente
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const newGroups = groups.map(g => ({ ...g, students: [] }));

    shuffled.forEach((student, index) => {
      const groupIndex = index % groups.length;
      newGroups[groupIndex].students.push(student);
    });

    setGroups(newGroups);
    setSuccess('Estudiantes distribuidos aleatoriamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      await api.post(`/courses/${course.id}/groups`, { groups });

      setSuccess('Grupos guardados exitosamente');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error al guardar grupos:', err);
      setError(err.response?.data?.message || 'Error al guardar grupos');
    } finally {
      setSaving(false);
    }
  };

  const getStudentGroup = (studentId) => {
    return groups.findIndex(group =>
      group.students.some(s => s.id === studentId)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Distribuir Grupos de Trabajo</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{course?.code} - {students.length} estudiantes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={addGroup}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition font-medium"
            >
              <Plus size={18} />
              Agregar Grupo
            </button>
            <button
              onClick={distributeRandomly}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-lg transition font-medium"
            >
              <Shuffle size={18} />
              Distribuir Aleatoriamente
            </button>
            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              Total: {groups.length} grupo{groups.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Groups */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Grupos Creados</h3>
              {groups.map((group, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => updateGroupName(index, e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => removeGroup(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Eliminar grupo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Integrantes ({group.students.length}):
                    </p>
                    {group.students.length > 0 ? (
                      <div className="space-y-1">
                        {group.students.map(student => (
                          <div
                            key={student.id}
                            className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded text-sm"
                          >
                            <User size={14} className="text-purple-600 dark:text-purple-400" />
                            <span className="text-gray-800 dark:text-gray-200">{student.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">Sin integrantes</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Students List */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Estudiantes Disponibles</h3>
              <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 max-h-[500px] overflow-y-auto">
                {students.length > 0 ? (
                  <div className="space-y-2">
                    {students.map(student => {
                      const groupIndex = getStudentGroup(student.id);
                      return (
                        <div key={student.id} className="border-b border-gray-200 dark:border-gray-600 last:border-0 pb-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">{student.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">@{student.username}</p>
                              </div>
                            </div>
                            {groupIndex >= 0 && (
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded">
                                {groups[groupIndex].name}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {groups.map((group, idx) => {
                              const isInGroup = group.students.some(s => s.id === student.id);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => toggleStudentInGroup(idx, student)}
                                  className={`px-3 py-1 text-xs rounded transition ${
                                    isInGroup
                                      ? 'bg-purple-500 text-white'
                                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                  }`}
                                >
                                  {group.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={48} />
                    <p className="text-gray-500 dark:text-gray-400">No hay estudiantes inscritos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar Grupos
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkGroupsModal;
