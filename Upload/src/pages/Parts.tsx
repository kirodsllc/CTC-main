import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { PartEntryForm } from "@/components/parts/PartEntryForm";
import { CreateKitForm } from "@/components/parts/CreateKitForm";
import { PartsList, Part } from "@/components/parts/PartsList";
import { KitsList, Kit } from "@/components/parts/KitsList";
import { ItemsListView, Item } from "@/components/parts/ItemsListView";
import { AttributesPage } from "@/components/attributes/AttributesPage";
import { ModelsPage } from "@/components/models/ModelsPage";
import { cn } from "@/lib/utils";
import { Plus, Package, Settings, Layers } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type TopTab = "parts-entry" | "items" | "attributes" | "models";
type LeftTab = "part-entry" | "create-kit";
type RightTab = "parts-list" | "kits-list";

const Parts = () => {
  const [topTab, setTopTab] = useState<TopTab>("parts-entry");
  const [leftTab, setLeftTab] = useState<LeftTab>("part-entry");
  const [rightTab, setRightTab] = useState<RightTab>("parts-list");
  const [showItemsForm, setShowItemsForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [searchFilters, setSearchFilters] = useState({
    search: '',
    master_part_no: '',
    part_no: '',
    brand_name: '',
    description: '',
    category_name: 'all',
    subcategory_name: 'all',
    application_name: 'all',
  });

  // Fetch parts from API
  useEffect(() => {
    const fetchParts = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getParts({ limit: 10000 });
        if (response.data) {
          // Transform API data to Part format
          const transformedParts: Part[] = response.data.map((p: any) => ({
            id: p.id,
            partNo: p.part_no,
            brand: p.brand_name || p.brand || "-",
            uom: p.uom || "NOS",
            cost: p.cost ? parseFloat(p.cost) : null,
            price: p.price_a ? parseFloat(p.price_a) : null,
            stock: 0, // TODO: Add stock tracking
          }));
          setParts(transformedParts);
        }
      } catch (error: any) {
        console.error("Error fetching parts:", error);
        toast({
          title: "Error",
          description: error.error || "Failed to fetch parts",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, []);

  // Fetch items for ItemsListView with pagination and filters
  const fetchItems = async (page: number = itemsPage, limit: number = itemsPerPage, filters = searchFilters) => {
    setItemsLoading(true);
    try {
      // Build API params with all filters
      const params: any = { page, limit };
      
      // Add search filters
      if (filters.search) params.search = filters.search;
      if (filters.master_part_no) params.master_part_no = filters.master_part_no;
      if (filters.part_no) params.part_no = filters.part_no;
      if (filters.brand_name) params.brand_name = filters.brand_name;
      if (filters.description) params.description = filters.description;
      if (filters.category_name && filters.category_name !== 'all') params.category_name = filters.category_name;
      if (filters.subcategory_name && filters.subcategory_name !== 'all') params.subcategory_name = filters.subcategory_name;
      if (filters.application_name && filters.application_name !== 'all') params.application_name = filters.application_name;
      
      const response = await apiClient.getParts(params);
      if (response.data && Array.isArray(response.data)) {
        // Transform API data to Item format for ItemsListView
        const transformedItems: Item[] = response.data.map((p: any) => {
          // Handle application - check multiple possible fields
          const applicationName = p.application_name || 
                                  p.application?.name || 
                                  (p.application && typeof p.application === 'object' && p.application.name ? p.application.name : null) ||
                                  "";
          
          return {
            id: p.id,
            masterPartNo: p.master_part_no || "",
            partNo: p.part_no || "",
            brand: p.brand_name || "",
            description: p.description || "",
            category: p.category_name || (p.category?.name) || "",
            subCategory: p.subcategory_name || (p.subcategory?.name) || "",
            application: applicationName || "",
            status: p.status === "active" ? "Active" : "Inactive",
            images: [p.image_p1, p.image_p2].filter(img => img && img.trim() !== ''),
          };
        });
        setItems(transformedItems);
        
        // Update total items from pagination info
        if (response.pagination) {
          setTotalItems(response.pagination.total);
        } else {
          // Fallback: if no pagination info, use items length (for backward compatibility)
          setTotalItems(transformedItems.length);
        }
      } else {
        console.error('Invalid response structure:', response);
        setItems([]);
      }
    } catch (error: any) {
      console.error("Error fetching items:", error);
      toast({
        title: "Error",
        description: error.error || "Failed to fetch items",
        variant: "destructive",
      });
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 when filters change
    setItemsPage(1);
    fetchItems(1, itemsPerPage, searchFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters, itemsPerPage]);

  useEffect(() => {
    // Fetch when page changes (but not when filters change)
    fetchItems(itemsPage, itemsPerPage, searchFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsPage]);

  const handleSavePart = async (partData: any) => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!partData.partNo || String(partData.partNo).trim() === '') {
        toast({
          title: "Validation Error",
          description: "Part number is required",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Transform form data to API format
      const apiData: any = {
        master_part_no: partData.masterPartNo || null,
        part_no: String(partData.partNo).trim(),
        brand_name: partData.brand || null,
        description: partData.description || null,
        category_id: partData.categoryId || partData.category || null,
        subcategory_id: partData.subCategoryId || partData.subCategory || null,
        application_id: partData.applicationId || partData.application || null,
        hs_code: partData.hsCode || null,
        weight: partData.weight ? parseFloat(partData.weight) : null,
        reorder_level: partData.reOrderLevel ? parseInt(partData.reOrderLevel) : 0,
        uom: partData.uom || "pcs",
        cost: partData.cost ? parseFloat(partData.cost) : null,
        price_a: partData.priceA ? parseFloat(partData.priceA) : null,
        price_b: partData.priceB ? parseFloat(partData.priceB) : null,
        price_m: partData.priceM ? parseFloat(partData.priceM) : null,
        smc: partData.smc || null,
        size: partData.size || null,
        status: partData.status === "A" ? "active" : "inactive",
        models: partData.modelQuantities
          ?.filter((mq: any) => mq && mq.model && String(mq.model).trim() !== '')
          .map((mq: any) => ({
            name: String(mq.model).trim(),
            qty_used: mq.qty || 1,
          })) || [],
      };

      // Handle images - if updating, explicitly set to null if not provided to clear them
      if (selectedPart) {
        // When updating, always include image fields (null if not provided to clear old images)
        apiData.image_p1 = partData.imageP1 !== undefined ? partData.imageP1 : null;
        apiData.image_p2 = partData.imageP2 !== undefined ? partData.imageP2 : null;
      } else {
        // When creating, only add if provided
        if (partData.imageP1) {
          apiData.image_p1 = partData.imageP1;
        }
        if (partData.imageP2) {
          apiData.image_p2 = partData.imageP2;
        }
      }

      let response;
      if (selectedPart) {
        // Update existing part
        response = await apiClient.updatePart(selectedPart.id, apiData);
      } else {
        // Create new part
        response = await apiClient.createPart(apiData);
      }

      if (response.error) {
        throw new Error(response.error);
      }

      // Transform and add to local state
      const savedPart = response.data || response;
      const newPart: Part = {
        id: savedPart.id,
        partNo: savedPart.part_no,
        brand: savedPart.brand_name || savedPart.brand || "-",
        uom: savedPart.uom || "NOS",
        cost: savedPart.cost ? parseFloat(savedPart.cost) : null,
        price: savedPart.price_a ? parseFloat(savedPart.price_a) : null,
        stock: 0,
      };

      if (selectedPart) {
        setParts((prev) => prev.map((p) => (p.id === selectedPart.id ? newPart : p)));
        setSelectedPart(null);
      } else {
        setParts((prev) => [newPart, ...prev]);
      }
      
      // Always refresh items list after create/update to ensure latest data with categories/applications
      await fetchItems(itemsPage, itemsPerPage);

      toast({
        title: "Success",
        description: selectedPart ? "Part updated successfully" : "Part created successfully",
      });
    } catch (error: any) {
      console.error("Error saving part:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save part",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [kitRefreshTrigger, setKitRefreshTrigger] = useState(0);

  const handleSaveKit = (kitData: any) => {
    // Kit is saved via API in CreateKitForm, just trigger refresh
    setKitRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteKit = (kit: Kit) => {
    // Kit is deleted via API in KitsList, just trigger refresh
    setKitRefreshTrigger(prev => prev + 1);
  };

  const handleUpdateKit = (updatedKit: Kit) => {
    // Kit is updated via API in EditKitForm, just trigger refresh
    setKitRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden ml-16">
        <Header />

        {/* Top Navigation Tabs */}
        <div className="bg-card border-b border-border px-4 py-2">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setTopTab("parts-entry")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-medium",
                topTab === "parts-entry"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Parts Entry
            </button>
            <button
              onClick={() => {
                setTopTab("items");
                setSelectedPart(null);
                // Refresh items when switching to items tab
                fetchItems(itemsPage, itemsPerPage);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-medium",
                topTab === "items"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Package className="w-3.5 h-3.5" />
              Items
            </button>
            <button
              onClick={() => {
                setTopTab("attributes");
                setSelectedPart(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-medium",
                topTab === "attributes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Settings className="w-3.5 h-3.5" />
              Attributes
            </button>
            <button
              onClick={() => {
                setTopTab("models");
                setSelectedPart(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-medium",
                topTab === "models"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Models
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-auto">
          {topTab === "parts-entry" && (
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
              {/* Left Section - Forms */}
              <ResizablePanel defaultSize={60} minSize={20} maxSize={80}>
                <div className="h-full flex flex-col pr-3">
                  {/* Left Tabs */}
                  <div className="flex border-b border-border mb-3">
                    <button
                      onClick={() => {
                        setLeftTab("part-entry");
                        setRightTab("parts-list");
                      }}
                      className={cn(
                        "px-4 py-2 text-xs font-medium transition-all relative",
                        leftTab === "part-entry"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Part Entry
                      {leftTab === "part-entry" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setLeftTab("create-kit");
                        setRightTab("kits-list");
                      }}
                      className={cn(
                        "px-4 py-2 text-xs font-medium transition-all relative",
                        leftTab === "create-kit"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Create Kit
                      {leftTab === "create-kit" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </button>
                  </div>

                  {/* Form Content */}
                  <div className="flex-1 overflow-auto">
                    {leftTab === "part-entry" ? (
                      <PartEntryForm 
                        onSave={handleSavePart} 
                        selectedPart={selectedPart}
                        onClearSelection={() => setSelectedPart(null)}
                      />
                    ) : (
                      <CreateKitForm onSave={handleSaveKit} />
                    )}
                  </div>
                </div>
              </ResizablePanel>

              {/* Resizable Handle */}
              <ResizableHandle withHandle className="mx-1 bg-border hover:bg-primary/50 transition-colors data-[resize-handle-active]:bg-primary" />

              {/* Right Section - Lists */}
              <ResizablePanel defaultSize={40} minSize={20} maxSize={80}>
                <div className="h-full flex flex-col pl-3">
                  {/* Right Tabs */}
                  <div className="flex border-b border-border mb-3">
                    <button
                      onClick={() => setRightTab("parts-list")}
                      className={cn(
                        "px-4 py-2 text-xs font-medium transition-all relative flex-1 text-center",
                        rightTab === "parts-list"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Parts List
                      {rightTab === "parts-list" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </button>
                    <button
                      onClick={() => setRightTab("kits-list")}
                      className={cn(
                        "px-4 py-2 text-xs font-medium transition-all relative flex-1 text-center",
                        rightTab === "kits-list"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Kits List
                      {rightTab === "kits-list" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </button>
                  </div>

                  {/* List Content */}
                  <div className="flex-1 overflow-hidden">
                    {rightTab === "parts-list" ? (
                      <PartsList 
                        parts={parts} 
                        onSelectPart={(part) => {
                          setSelectedPart(part);
                          setLeftTab("part-entry");
                        }}
                      />
                    ) : (
                      <KitsList refreshTrigger={kitRefreshTrigger} onDelete={handleDeleteKit} onUpdateKit={handleUpdateKit} />
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}

          {topTab === "items" && (
            <ItemsListView 
              items={items}
              loading={itemsLoading}
              currentPage={itemsPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              searchFilters={searchFilters}
              onFiltersChange={(filters) => {
                setSearchFilters(filters);
              }}
              onPageChange={(page) => {
                setItemsPage(page);
              }}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setItemsPage(1);
              }}
              onEdit={(item) => {
                setEditingItem(item);
                setShowItemsForm(true);
              }}
              onDelete={async (item) => {
                try {
                  // Optimistically remove from UI
                  setItems(prev => prev.filter(i => i.id !== item.id));
                  setTotalItems(prev => Math.max(0, prev - 1));
                  
                  const response = await apiClient.deletePart(item.id);
                  
                  if (response.error) {
                    throw new Error(response.error);
                  }

                  // Silently refresh in background to sync with server
                  fetchItems(itemsPage, itemsPerPage).catch(err => {
                    console.error("Background refresh failed:", err);
                  });
                } catch (error: any) {
                  console.error("Error deleting item:", error);
                  // Restore item on error
                  fetchItems(itemsPage, itemsPerPage);
                  toast({
                    title: "Error",
                    description: error.message || "Failed to delete item",
                    variant: "destructive",
                  });
                }
              }}
              onBulkDelete={async (itemIds: string[]) => {
                const success: string[] = [];
                const failed: string[] = [];
                
                // Optimistically remove all items from UI
                setItems(prev => {
                  const removed = prev.filter(i => itemIds.includes(i.id));
                  const remaining = prev.filter(i => !itemIds.includes(i.id));
                  setTotalItems(prevTotal => Math.max(0, prevTotal - removed.length));
                  return remaining;
                });
                
                // Delete in background (parallel)
                const deletePromises = itemIds.map(async (id) => {
                  try {
                    const response = await apiClient.deletePart(id);
                    if (response.error) {
                      throw new Error(response.error);
                    }
                    success.push(id);
                  } catch (error: any) {
                    console.error(`Error deleting item ${id}:`, error);
                    failed.push(id);
                  }
                });
                
                await Promise.all(deletePromises);
                
                // Silently refresh in background to sync
                fetchItems(itemsPage, itemsPerPage).catch(err => {
                  console.error("Background refresh failed:", err);
                });
                
                return { success, failed };
              }}
              onItemsUpdate={(updatedItems) => {
                setItems(updatedItems);
                setTotalItems(updatedItems.length);
              }}
              onAddNew={() => {
                setEditingItem(null);
                setShowItemsForm(true);
              }}
              onStatusChange={async (item, newStatus) => {
                try {
                  setItemsLoading(true);
                  const apiData = {
                    master_part_no: item.masterPartNo || null,
                    part_no: item.partNo,
                    brand_name: item.brand || null,
                    description: item.description || null,
                    category_id: null, // Will need to fetch these from API
                    subcategory_id: null,
                    application_id: null,
                    status: newStatus === "Active" ? "active" : "inactive",
                  };
                  
                  const response = await apiClient.updatePart(item.id, apiData);
                  
                  if (response.error) {
                    throw new Error(response.error);
                  }

                  // Refresh items list
                  await fetchItems(itemsPage, itemsPerPage);

                  toast({
                    title: "Success",
                    description: "Status updated successfully",
                  });
                } catch (error: any) {
                  console.error("Error updating status:", error);
                  toast({
                    title: "Error",
                    description: error.message || "Failed to update status",
                    variant: "destructive",
                  });
                } finally {
                  setItemsLoading(false);
                }
              }}
              showForm={showItemsForm}
              onCancelForm={() => {
                setShowItemsForm(false);
                setEditingItem(null);
              }}
              onSavePart={async (partData, isEdit, editItemId) => {
                try {
                  setItemsLoading(true);
                  
                  // Transform form data to API format
                  const apiData: any = {
                    master_part_no: partData.masterPartNo || null,
                    part_no: partData.partNo,
                    brand_name: partData.brand || null,
                    description: partData.description || null,
                    category_id: partData.categoryId || partData.category || null,
                    subcategory_id: partData.subCategoryId || partData.subCategory || null,
                    application_id: partData.applicationId || partData.application || null,
                    hs_code: partData.hsCode || null,
                    weight: partData.weight ? parseFloat(partData.weight) : null,
                    reorder_level: partData.reOrderLevel ? parseInt(partData.reOrderLevel) : 0,
                    uom: partData.uom || "pcs",
                    cost: partData.cost ? parseFloat(partData.cost) : null,
                    price_a: partData.priceA ? parseFloat(partData.priceA) : null,
                    price_b: partData.priceB ? parseFloat(partData.priceB) : null,
                    price_m: partData.priceM ? parseFloat(partData.priceM) : null,
                    smc: partData.smc || null,
                    size: partData.size || null,
                    status: partData.status === "A" ? "active" : "inactive",
                  };

                  // Handle images - if updating, explicitly set to null if not provided to clear them
                  if (isEdit && editItemId) {
                    // When updating, always include image fields (null if not provided to clear old images)
                    apiData.image_p1 = partData.imageP1 !== undefined ? partData.imageP1 : null;
                    apiData.image_p2 = partData.imageP2 !== undefined ? partData.imageP2 : null;
                  } else {
                    // When creating, only add if provided
                    if (partData.imageP1) {
                      apiData.image_p1 = partData.imageP1;
                    }
                    if (partData.imageP2) {
                      apiData.image_p2 = partData.imageP2;
                    }
                  }

                  let response;
                  if (isEdit && editItemId) {
                    // Update existing item
                    response = await apiClient.updatePart(editItemId, apiData);
                  } else {
                    // Create new item
                    response = await apiClient.createPart(apiData);
                  }

                  if (response.error) {
                    throw new Error(response.error);
                  }

                  // Refresh items list
                  await fetchItems(itemsPage, itemsPerPage);

                  toast({
                    title: "Success",
                    description: isEdit ? "Item updated successfully" : "Item created successfully",
                  });
                  
                  setEditingItem(null);
                } catch (error: any) {
                  console.error("Error saving item:", error);
                  toast({
                    title: "Error",
                    description: error.message || "Failed to save item",
                    variant: "destructive",
                  });
                } finally {
                  setItemsLoading(false);
                }
              }}
              editItem={editingItem}
              kits={kits}
              onDeleteKit={handleDeleteKit}
              onUpdateKit={handleUpdateKit}
            />
          )}

          {topTab === "attributes" && (
            <AttributesPage />
          )}

          {topTab === "models" && (
            <ModelsPage items={items} />
          )}
        </main>
      </div>
    </div>
  );
};

export default Parts;
