"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Paperclip,
  FileText,
  Image,
  Video,
  Music,
  Download,
  Calendar,
  FolderOpen,
  Edit,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface Anexo {
  id: string;
  pacienteId: string;
  profissionalId: string;
  tipo: string;
  categoria?: string;
  titulo: string;
  descricao?: string;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tipo: string;
  arquivo_size: number;
  data_documento?: string;
  createdAt: string;
  updatedAt: string;
  paciente: {
    id: string;
    nome: string;
  };
}

interface ProntuarioAnexosProps {
  pacienteId: string;
  onOpenDialog?: (open: boolean) => void;
  dialogOpen?: boolean;
}

export function ProntuarioAnexos({
  pacienteId,
  onOpenDialog,
  dialogOpen = false,
}: ProntuarioAnexosProps) {
  const { user } = useAuth();
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    tipo: "",
    categoria: "",
    titulo: "",
    descricao: "",
    data_documento: "",
    arquivo_url: "",
    arquivo_nome: "",
    arquivo_tipo: "",
    arquivo_size: 0,
  });

  useEffect(() => {
    const fetchAnexos = async () => {
      try {
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const userDataEncoded = btoa(JSON.stringify(user));

        const response = await fetch("/api/anexos", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar anexos");
        }

        const data = await response.json();
        if (data.success) {
          // Filtrar anexos do paciente
          const anexosPaciente = data.data.filter(
            (a: Anexo) => a.pacienteId === pacienteId
          );
          setAnexos(anexosPaciente);
        }
      } catch (error) {
        console.error("Erro ao buscar anexos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnexos();
  }, [pacienteId, user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Arquivo muito grande. Tamanho máximo: 10MB");
      return;
    }

    setSelectedFile(file);

    // Criar preview para imagens
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    // Auto-preencher título com nome do arquivo se estiver vazio
    if (!formData.titulo) {
      setFormData({ ...formData, titulo: file.name.replace(/\.[^/.]+$/, "") });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  const handleEdit = (anexo: Anexo) => {
    setEditingId(anexo.id);
    setFormData({
      tipo: anexo.tipo,
      categoria: anexo.categoria || "",
      titulo: anexo.titulo,
      descricao: anexo.descricao || "",
      data_documento: anexo.data_documento
        ? new Date(anexo.data_documento).toISOString().split("T")[0]
        : "",
      arquivo_url: anexo.arquivo_url,
      arquivo_nome: anexo.arquivo_nome,
      arquivo_tipo: anexo.arquivo_tipo,
      arquivo_size: anexo.arquivo_size,
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    if (onOpenDialog) {
      onOpenDialog(true);
    } else {
      setOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;

    try {
      setDeleting(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/anexos?id=${deleteId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir anexo");
      }

      const data = await response.json();
      if (data.success) {
        setAnexos(anexos.filter((a) => a.id !== deleteId));
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Erro ao excluir anexo:", error);
      alert("Erro ao excluir anexo. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      if (!formData.tipo || !formData.titulo) {
        alert("Tipo e título são obrigatórios");
        return;
      }

      if (!editingId && !selectedFile) {
        alert("Selecione um arquivo para fazer upload");
        return;
      }

      setSaving(true);
      let uploadedFileData = null;

      // Se não está editando e tem arquivo selecionado, fazer upload
      if (!editingId && selectedFile) {
        setUploading(true);
        setUploadProgress(0);

        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);

        const userDataEncoded = btoa(JSON.stringify(user));

        // Simular progresso (Vercel Blob não fornece progresso real)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        try {
          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "X-User-Data": userDataEncoded,
              "X-Auth-Token": user.token,
            },
            body: uploadFormData,
          });

          clearInterval(progressInterval);
          setUploadProgress(100);

          if (!uploadResponse.ok) {
            throw new Error("Erro ao fazer upload do arquivo");
          }

          const uploadData = await uploadResponse.json();
          if (!uploadData.success) {
            throw new Error(uploadData.error || "Erro ao fazer upload");
          }

          uploadedFileData = uploadData.data;
        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        } finally {
          setUploading(false);
        }
      }

      // Salvar anexo no banco
      const userDataEncoded = btoa(JSON.stringify(user));
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? {
            id: editingId,
            tipo: formData.tipo,
            categoria: formData.categoria,
            titulo: formData.titulo,
            descricao: formData.descricao,
            data_documento: formData.data_documento,
          }
        : {
            pacienteId,
            tipo: formData.tipo,
            categoria: formData.categoria,
            titulo: formData.titulo,
            descricao: formData.descricao,
            data_documento: formData.data_documento,
            arquivo_url: uploadedFileData?.url,
            arquivo_nome: uploadedFileData?.fileName,
            arquivo_tipo: uploadedFileData?.fileType,
            arquivo_size: uploadedFileData?.fileSize,
          };

      const response = await fetch("/api/anexos", {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar anexo");
      }

      const data = await response.json();
      if (data.success) {
        if (editingId) {
          setAnexos(anexos.map((a) => (a.id === editingId ? data.data : a)));
        } else {
          setAnexos([data.data, ...anexos]);
        }

        setFormData({
          tipo: "",
          categoria: "",
          titulo: "",
          descricao: "",
          data_documento: "",
          arquivo_url: "",
          arquivo_nome: "",
          arquivo_tipo: "",
          arquivo_size: 0,
        });
        setEditingId(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadProgress(0);

        if (onOpenDialog) {
          onOpenDialog(false);
        } else {
          setOpen(false);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar anexo:", error);
      alert("Erro ao salvar anexo. Tente novamente.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getTipoLabel = (tipo: string): string => {
    const labels: Record<string, string> = {
      DOCUMENTO: "Documento",
      EXAME: "Exame",
      LAUDO: "Laudo",
      FOTO: "Foto",
      VIDEO: "Vídeo",
      AUDIO: "Áudio",
      OUTROS: "Outros",
    };
    return labels[tipo] || tipo;
  };

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, { variant: any; className?: string }> = {
      DOCUMENTO: { variant: "default", className: "bg-blue-600" },
      EXAME: { variant: "default", className: "bg-purple-600" },
      LAUDO: { variant: "default", className: "bg-indigo-600" },
      FOTO: { variant: "default", className: "bg-green-600" },
      VIDEO: { variant: "default", className: "bg-red-600" },
      AUDIO: { variant: "default", className: "bg-yellow-600" },
      OUTROS: { variant: "outline" },
    };

    const config = variants[tipo] || { variant: "outline" };

    return (
      <Badge variant={config.variant} className={config.className}>
        {getTipoLabel(tipo)}
      </Badge>
    );
  };

  const getFileIcon = (tipo: string, mimeType: string) => {
    if (tipo === "FOTO" || mimeType.startsWith("image/")) {
      return <Image className="h-5 w-5" />;
    }
    if (tipo === "VIDEO" || mimeType.startsWith("video/")) {
      return <Video className="h-5 w-5" />;
    }
    if (tipo === "AUDIO" || mimeType.startsWith("audio/")) {
      return <Music className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  // Calcular estatísticas
  const totalAnexos = anexos.length;
  const porTipo = anexos.reduce((acc, anexo) => {
    acc[anexo.tipo] = (acc[anexo.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSize = anexos.reduce((acc, anexo) => acc + anexo.arquivo_size, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Carregando anexos...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dialog */}
      <Dialog open={dialogOpen ?? open} onOpenChange={onOpenDialog ?? setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Anexo" : "Novo Anexo"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Edite as informações do anexo"
                : "Faça upload de documentos, exames, fotos e outros arquivos"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Upload de Arquivo - apenas para novos anexos */}
            {!editingId && (
              <div className="grid gap-2">
                <Label htmlFor="file">
                  Arquivo <span className="text-red-500">*</span>
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                  {!selectedFile ? (
                    <label
                      htmlFor="file"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Clique para selecionar ou arraste o arquivo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Máximo 10MB - PDF, DOC, XLS, Imagens, Vídeos, Áudios
                      </p>
                      <input
                        id="file"
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mpeg,.mov,.webm,.mp3,.wav,.ogg"
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      {/* Preview de Imagem */}
                      {previewUrl && (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-48 mx-auto rounded-lg border"
                          />
                        </div>
                      )}

                      {/* Info do Arquivo */}
                      <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {selectedFile.type.startsWith("image/") ? (
                            <Image className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          ) : selectedFile.type.startsWith("video/") ? (
                            <Video className="h-5 w-5 text-red-600 flex-shrink-0" />
                          ) : selectedFile.type.startsWith("audio/") ? (
                            <Music className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(selectedFile.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveFile}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Progress Bar */}
                      {uploading && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Fazendo upload...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tipo">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCUMENTO">Documento</SelectItem>
                    <SelectItem value="EXAME">Exame</SelectItem>
                    <SelectItem value="LAUDO">Laudo</SelectItem>
                    <SelectItem value="FOTO">Foto</SelectItem>
                    <SelectItem value="VIDEO">Vídeo</SelectItem>
                    <SelectItem value="AUDIO">Áudio</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ex: Exames de sangue"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="titulo">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título do documento"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="data_documento">Data do Documento</Label>
              <Input
                id="data_documento"
                type="date"
                value={formData.data_documento}
                onChange={(e) => setFormData({ ...formData, data_documento: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do anexo"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (onOpenDialog) {
                  onOpenDialog(false);
                } else {
                  setOpen(false);
                }
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Atualizar Anexo" : "Salvar Anexo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Arquivos</CardDescription>
            <CardTitle className="text-3xl">{totalAnexos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Documentos</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {porTipo.DOCUMENTO || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Exames</CardDescription>
            <CardTitle className="text-3xl text-purple-600">
              {porTipo.EXAME || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tamanho Total</CardDescription>
            <CardTitle className="text-2xl">{formatFileSize(totalSize)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de Anexos */}
      {anexos.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum anexo registrado</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {anexos.map((anexo) => (
            <Card key={anexo.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTipoBadge(anexo.tipo)}
                      {anexo.categoria && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {anexo.categoria}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getFileIcon(anexo.tipo, anexo.arquivo_tipo)}
                      {anexo.titulo}
                    </CardTitle>
                    <CardDescription>
                      {anexo.arquivo_nome} • {formatFileSize(anexo.arquivo_size)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(anexo)}
                      title="Editar anexo"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(anexo.id)}
                      title="Excluir anexo"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <a
                      href={anexo.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Button variant="ghost" size="icon" title="Baixar anexo">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Datas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {anexo.data_documento && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Data do documento: {formatDate(anexo.data_documento)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Upload em: {formatDate(anexo.createdAt)}</span>
                  </div>
                </div>

                {/* Descrição */}
                {anexo.descricao && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Descrição
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {anexo.descricao}
                    </p>
                  </div>
                )}

                {/* Preview para imagens */}
                {(anexo.tipo === "FOTO" || anexo.arquivo_tipo.startsWith("image/")) && (
                  <div className="mt-3">
                    <img
                      src={anexo.arquivo_url}
                      alt={anexo.titulo}
                      className="max-w-full h-auto max-h-64 rounded-lg border"
                      loading="lazy"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Alert Dialog for Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este anexo? Esta ação não pode ser
              desfeita e o arquivo será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
