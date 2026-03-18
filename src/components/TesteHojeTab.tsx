import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TesteHojeTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste hoje</CardTitle>
          <CardDescription>
            Ambiente reservado para prototipação e testes do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aba em branco criada de acordo com a solicitação para testes e integrações futuras.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TesteHojeTab;
