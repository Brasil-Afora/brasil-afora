import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  pixelBasedPreset,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface ResetPasswordTemplateProps {
  name: string;
  url: string;
}

export function ResetPasswordTemplate({
  name,
  url,
}: ResetPasswordTemplateProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body>
          <Preview>Ola, {name}! Crie uma nova senha para sua conta.</Preview>
          <Container>
            <Section className="px-[32px] py-[40px]">
              <Row>
                <Column className="w-[80%]">
                  <Img
                    alt="React Email logo"
                    height="42"
                    src="https://react.email/static/logo-without-background.png"
                  />
                </Column>
                <Column align="right">
                  <Row align="right">
                    <Column>
                      <Link href="#">
                        <Img
                          alt="X"
                          className="mx-[4px]"
                          height="36"
                          src="https://react.email/static/x-logo.png"
                          width="36"
                        />
                      </Link>
                    </Column>
                    <Column>
                      <Link href="#">
                        <Img
                          alt="Instagram"
                          className="mx-[4px]"
                          height="36"
                          src="https://react.email/static/instagram-logo.png"
                          width="36"
                        />
                      </Link>
                    </Column>
                    <Column>
                      <Link href="#">
                        <Img
                          alt="Facebook"
                          className="mx-[4px]"
                          height="36"
                          src="https://react.email/static/facebook-logo.png"
                          width="36"
                        />
                      </Link>
                    </Column>
                  </Row>
                </Column>
              </Row>
            </Section>
            <Section>
              <table
                align="center"
                border={0}
                cellPadding="0"
                cellSpacing="0"
                className="my-[16px] h-[424px] rounded-[12px]"
                role="presentation"
                width="100%"
              >
                <tbody>
                  <tr>
                    <td align="center" className="p-[40px] text-center">
                      <Text className="m-0 font-semibold text-zinc-700">
                        Ola, {name}
                      </Text>
                      <Heading
                        as="h1"
                        className="m-0 mt-[8px] font-bold text-zinc-900"
                      >
                        Redefinicao de Senha
                      </Heading>
                      <Text className="m-0 mt-[20px] text-[16px] text-zinc-900 leading-[24px]">
                        Falta pouco para redefinir sua senha! Basta clicar no
                        botao abaixo para criar uma nova senha para sua conta.
                      </Text>
                      <Button
                        className="mt-[28px] rounded-[8px] border border-gray-200 border-solid bg-white px-[40px] py-[12px] font-semibold text-zinc-900"
                        href={url}
                      >
                        Redefinir
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
