import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tag, Plus, Loader2, Search, AlertCircle, RefreshCw, Edit, Trash2, CheckCircle2, XCircle, Clock, Calendar
} from 'lucide-react';
import type { PromoCode, PromoCodeRedemption } from '@/types/promo-code';

export const PromoCodesTabContent: React.FC = () => {
  const { toast } = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [redemptions, setRedemptions] = useState<PromoCodeRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    max_uses: '',
    min_purchase_amount: '',
    is_active: true,
    starts_at: '',
    expires_at: '',
    description: '',
  });

  const resetForm = () => {
    setForm({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      max_uses: '',
      min_purchase_amount: '',
      is_active: true,
      starts_at: '',
      expires_at: '',
      description: '',
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: codes, error: codesError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      setPromoCodes(codes || []);

      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('promo_code_redemptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (redemptionsError) throw redemptionsError;
      setRedemptions(redemptionsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading promo codes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCodes = promoCodes.filter(code => {
    const searchLower = searchTerm.toLowerCase();
    return (
      code.code.toLowerCase().includes(searchLower) ||
      (code.description || '').toLowerCase().includes(searchLower)
    );
  });

  const isCodeExpired = (code: PromoCode) => {
    if (!code.expires_at) return false;
    return new Date(code.expires_at) < new Date();
  };

  const isCodeUpcoming = (code: PromoCode) => {
    if (!code.starts_at) return false;
    return new Date(code.starts_at) > new Date();
  };

  const getCodeStatus = (code: PromoCode) => {
    if (!code.is_active) return { label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200' as const };
    if (isCodeExpired(code)) return { label: 'Expired', color: 'bg-red-50 text-red-700 border-red-200' as const };
    if (isCodeUpcoming(code)) return { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' as const };
    if (code.max_uses !== null && code.current_uses >= code.max_uses) return { label: 'Fully Used', color: 'bg-orange-50 text-orange-700 border-orange-200' as const };
    return { label: 'Active', color: 'bg-green-50 text-green-700 border-green-200' as const };
  };

  const getRedemptionsForCode = (codeId: string) => {
    return redemptions.filter(r => r.promo_code_id === codeId);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      toast({ title: "Validation Error", description: "Promo code is required.", variant: "destructive" });
      return;
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      toast({ title: "Validation Error", description: "Discount value must be greater than 0.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const dbCode = form.code.trim().toUpperCase();
      const { error } = await supabase.from('promo_codes').insert({
        code: dbCode,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        min_purchase_amount: form.min_purchase_amount ? parseFloat(form.min_purchase_amount) : null,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        description: form.description || null,
      });

      if (error) throw error;

      toast({ title: "Promo Code Created", description: `Code "${dbCode}" has been created.` });
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error creating promo code", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCode) return;

    setSaving(true);
    try {
      const dbCode = form.code.trim().toUpperCase();
      const { error } = await supabase.from('promo_codes').update({
        code: dbCode,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        min_purchase_amount: form.min_purchase_amount ? parseFloat(form.min_purchase_amount) : null,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        description: form.description || null,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedCode.id);

      if (error) throw error;

      toast({ title: "Promo Code Updated", description: `Code "${dbCode}" has been updated.` });
      setEditDialogOpen(false);
      setSelectedCode(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error updating promo code", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCode) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', selectedCode.id);
      if (error) throw error;
      toast({ title: "Promo Code Deleted", description: `Code "${selectedCode.code}" has been deleted.` });
      setDeleteDialogOpen(false);
      setSelectedCode(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error deleting promo code", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (code: PromoCode) => {
    setSelectedCode(code);
    setForm({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: code.discount_value.toString(),
      max_uses: code.max_uses?.toString() || '',
      min_purchase_amount: code.min_purchase_amount?.toString() || '',
      is_active: code.is_active,
      starts_at: code.starts_at ? code.starts_at.slice(0, 16) : '',
      expires_at: code.expires_at ? code.expires_at.slice(0, 16) : '',
      description: code.description || '',
    });
    setEditDialogOpen(true);
  };

  const totalRedemptions = redemptions.reduce((acc, r) => acc + r.discount_amount, 0);

  return (
    <div className="space-y-8 py-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Promo Codes</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">{promoCodes.length}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {promoCodes.filter(c => c.is_active && !isCodeExpired(c) && !isCodeUpcoming(c)).length} active
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Redemptions</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">{redemptions.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-700 rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Discount Given</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">${totalRedemptions.toFixed(2)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Expired Codes</p>
              <h3 className="text-2xl font-bold text-[#1C0357]">
                {promoCodes.filter(c => isCodeExpired(c)).length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-[#1C0357]">Promo Codes</CardTitle>
              <CardDescription>Create and manage discount codes for your store and services.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-xl border-gray-200"
                />
              </div>
              <Button
                onClick={() => { resetForm(); setCreateDialogOpen(true); }}
                className="bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" /> New Code
              </Button>
              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1C0357] mb-2" />
              <p className="text-sm text-gray-500">Loading promo codes...</p>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>{searchTerm ? 'No promo codes matching your search.' : 'No promo codes yet. Create your first one!'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-gray-100">
                    <TableHead className="font-bold text-gray-600">Code</TableHead>
                    <TableHead className="font-bold text-gray-600">Discount</TableHead>
                    <TableHead className="font-bold text-gray-600">Status</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">Uses</TableHead>
                    <TableHead className="font-bold text-gray-600">Valid Period</TableHead>
                    <TableHead className="font-bold text-gray-600">Description</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodes.map((code) => {
                    const status = getCodeStatus(code);
                    const codeRedemptions = getRedemptionsForCode(code.id);
                    return (
                      <TableRow key={code.id} className="border-gray-100 hover:bg-gray-50/50">
                        <TableCell>
                          <span className="font-mono font-bold text-[#1C0357]">{code.code}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-gray-900">
                            {code.discount_type === 'percentage'
                              ? `${code.discount_value}%`
                              : `$${code.discount_value.toFixed(2)}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} border hover:${status.color}`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-bold text-gray-700">
                            {code.current_uses}{code.max_uses !== null ? ` / ${code.max_uses}` : ''}
                          </span>
                          {codeRedemptions.length > 0 && (
                            <span className="text-[10px] text-gray-400 block">
                              (${codeRedemptions.reduce((s, r) => s + r.discount_amount, 0).toFixed(2)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">
                          {code.starts_at ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(code.starts_at).toLocaleDateString()}
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                          {code.expires_at && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {new Date(code.expires_at).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 truncate max-w-[200px] block">
                            {code.description || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                            title="Edit"
                            onClick={() => openEditDialog(code)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-red-600 hover:text-red-900 hover:bg-red-50"
                            title="Delete"
                            onClick={() => { setSelectedCode(code); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1C0357]">Create Promo Code</DialogTitle>
            <DialogDescription>
              Create a new discount code for your store or services.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="code" className="font-bold text-gray-700">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="rounded-xl border-gray-200 font-mono font-bold uppercase"
                  placeholder="SUMMER2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount-type" className="font-bold text-gray-700">Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(v: 'percentage' | 'fixed') => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger id="discount-type" className="rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount-value" className="font-bold text-gray-700">
                  {form.discount_type === 'percentage' ? 'Percentage Off' : 'Fixed Amount Off'}
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  className="rounded-xl border-gray-200"
                  placeholder={form.discount_type === 'percentage' ? '10' : '5.00'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-uses" className="font-bold text-gray-700">Max Uses <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="max-uses"
                  type="number"
                  min="1"
                  value={form.max_uses}
                  onChange={(e) => setForm(f => ({ ...f, max_uses: e.target.value }))}
                  className="rounded-xl border-gray-200"
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-purchase" className="font-bold text-gray-700">Min Purchase <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="min-purchase"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_purchase_amount}
                  onChange={(e) => setForm(f => ({ ...f, min_purchase_amount: e.target.value }))}
                  className="rounded-xl border-gray-200"
                  placeholder="No minimum"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="starts-at" className="font-bold text-gray-700">Start Date <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="starts-at"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))}
                  className="rounded-xl border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires-at" className="font-bold text-gray-700">Expiry Date <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="rounded-xl border-gray-200"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description" className="font-bold text-gray-700">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className="rounded-xl border-gray-200"
                  placeholder="e.g., 10% off summer sale"
                  rows={2}
                />
              </div>

              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  id="is-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))}
                />
                <Label htmlFor="is-active" className="font-bold text-gray-700 cursor-pointer">Active immediately</Label>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                className="rounded-xl border-gray-200 font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold"
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Promo Code'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1C0357]">Edit Promo Code</DialogTitle>
            <DialogDescription>
              Update the promo code details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-code" className="font-bold text-gray-700">Code</Label>
                <Input
                  id="edit-code"
                  value={form.code}
                  onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="rounded-xl border-gray-200 font-mono font-bold uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(v: 'percentage' | 'fixed') => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger className="rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Discount Value</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  className="rounded-xl border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Max Uses</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_uses}
                  onChange={(e) => setForm(f => ({ ...f, max_uses: e.target.value }))}
                  className="rounded-xl border-gray-200"
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Min Purchase</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_purchase_amount}
                  onChange={(e) => setForm(f => ({ ...f, min_purchase_amount: e.target.value }))}
                  className="rounded-xl border-gray-200"
                  placeholder="No minimum"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Start Date</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))}
                  className="rounded-xl border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Expiry Date</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="rounded-xl border-gray-200"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="font-bold text-gray-700">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className="rounded-xl border-gray-200"
                  rows={2}
                />
              </div>

              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  id="edit-is-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))}
                />
                <Label htmlFor="edit-is-active" className="font-bold text-gray-700 cursor-pointer">Active</Label>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="rounded-xl border-gray-200 font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#1C0357] hover:bg-[#1C0357]/90 text-white font-bold"
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1C0357]">Delete Promo Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCode?.code}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl border-gray-200 font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={saving}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
