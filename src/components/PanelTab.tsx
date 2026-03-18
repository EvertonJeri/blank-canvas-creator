import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PanelTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Painel</CardTitle>
          <CardDescription>
            Visão geral consolidada do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Área reservada para o painel de indicadores e demais funcionalidades abrangentes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PanelTab;
