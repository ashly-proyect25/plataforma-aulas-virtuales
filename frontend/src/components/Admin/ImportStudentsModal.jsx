// frontend/src/components/Admin/ImportStudentsModal.jsx

import { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Users, Loader } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const ImportStudentsModal = ({ isOpen, onClose, courseId, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(selectedFile.type)) {
      setError('Por favor selecciona un archivo Excel válido (.xls o .xlsx)');
      return;
    }

    setFile(selectedFile);
    setError('');
    parseExcel(selectedFile);
  };

  const parseExcel = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validar estructura
        if (jsonData.length === 0) {
          setError('El archivo está vacío');
          return;
        }

        // Mapear datos
        const mappedStudents = jsonData.map((row, index) => ({
          rowNumber: index + 2, // +2 porque Excel empieza en 1 y tiene header
          username: row.username || row.usuario || row.Usuario || '',
          name: row.name || row.nombre || row.Nombre || '',
          email: row.email || row.correo || row.Email || '',
          password: row.password || row.contraseña || row.Contraseña || ''
        }));

        // Validar campos requeridos
        const invalidRows = mappedStudents.filter(
          s => !s.username || !s.name || !s.email || !s.password
        );

        if (invalidRows.length > 0) {
          setError(`Faltan datos en ${invalidRows.length} fila(s). Revisa el archivo.`);
          setStudents(mappedStudents); // Mostrar de todos modos para que vea el error
          setPreview(true);
          return;
        }

        setStudents(mappedStudents);
        setPreview(true);
        setError('');
      } catch (err) {
        setError('Error al procesar el archivo. Verifica el formato.');
        console.error(err);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (students.length === 0) {
      setError('No hay estudiantes para importar');
      return;
    }

    // Validar que todos tengan datos
    const invalidStudents = students.filter(
      s => !s.username || !s.name || !s.email || !s.password
    );

    if (invalidStudents.length > 0) {
      setError('Todos los estudiantes deben tener username, nombre, email y contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/courses/import-students', {
        courseId,
        students: students.map(s => ({
          username: s.username.trim(),
          name: s.name.trim(),
          email: s.email.trim(),
          password: s.password.trim()
        }))
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
          resetForm();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al importar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Crear template Excel
    const template = [
      {
        username: 'est001',
        name: 'Juan Pérez',
        email: 'juan.perez@ejemplo.com',
        password: 'password123'
      },
      {
        username: 'est002',
        name: 'María García',
        email: 'maria.garcia@ejemplo.com',
        password: 'password456'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');
    XLSX.writeFile(workbook, 'plantilla_estudiantes.xlsx');
  };

  const resetForm = () => {
    setFile(null);
    setStudents([]);
    setPreview(false);
    setError('');
    setSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={28} />
            <div>
              <h2 className="text-2xl font-bold">Importar Estudiantes desde Excel</h2>
              <p className="text-green-100 text-sm">Agregar múltiples estudiantes a la vez</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!preview ? (
            <div className="space-y-6">
              {/* Instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Instrucciones
                </h3>
                <ol className="text-sm text-blue-800 space-y-1 ml-6 list-decimal">
                  <li>Descarga la plantilla de Excel</li>
                  <li>Completa los datos de los estudiantes</li>
                  <li>Columnas requeridas: <code className="bg-blue-100 px-1 rounded">username</code>, <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">email</code>, <code className="bg-blue-100 px-1 rounded">password</code></li>
                  <li>Sube el archivo completado</li>
                </ol>
              </div>

              {/* Descargar Template */}
              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition font-semibold"
              >
                <Download size={20} />
                Descargar Plantilla Excel
              </button>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition">
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                  disabled={loading}
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-700 font-semibold mb-2">
                    Click para seleccionar archivo Excel
                  </p>
                  <p className="text-sm text-gray-500">
                    Formatos soportados: .xls, .xlsx
                  </p>
                  {file && (
                    <p className="text-sm text-green-600 mt-3 font-semibold">
                      ✓ {file.name}
                    </p>
                  )}
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Users size={20} />
                  Vista Previa ({students.length} estudiantes)
                </h3>
                <button
                  onClick={resetForm}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">#</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Usuario</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const isValid = student.username && student.name && student.email && student.password;
                      return (
                        <tr key={index} className={`border-t ${!isValid ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-2 text-gray-600">{index + 1}</td>
                          <td className="px-4 py-2 font-mono">{student.username || <span className="text-red-500">Falta</span>}</td>
                          <td className="px-4 py-2">{student.name || <span className="text-red-500">Falta</span>}</td>
                          <td className="px-4 py-2 text-gray-600">{student.email || <span className="text-red-500">Falta</span>}</td>
                          <td className="px-4 py-2">
                            {isValid ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : (
                              <AlertCircle size={16} className="text-red-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 items-start">
                  <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 font-medium">
                    ¡{students.length} estudiantes importados exitosamente!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {preview && (
          <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
            <button
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50"
              disabled={loading || students.some(s => !s.username || !s.name || !s.email || !s.password)}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Importar {students.length} Estudiantes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportStudentsModal;