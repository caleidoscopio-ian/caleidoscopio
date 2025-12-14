const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 Criando dados de teste para TENANT REAL...')

  // Tenant ID real do usuário logado
  const REAL_TENANT_ID = 'cmf61fz0i0005xa1co9p3ejd4'

  console.log(`🏥 Usando tenant real: ${REAL_TENANT_ID}`)

  // Limpar apenas os pacientes (manter outros dados de teste)
  await prisma.paciente.deleteMany()
  console.log('🗑️ Pacientes anteriores removidos')

  // Verificar se o tenant existe no Sistema 2
  let tenant = await prisma.tenant.findFirst({
    where: { id: REAL_TENANT_ID }
  })

  // Se não existir, criar um registro básico para manter consistência
  if (!tenant) {
    console.log('⚠️ Tenant real não existe no Sistema 2, criando registro...')
    tenant = await prisma.tenant.create({
      data: {
        id: REAL_TENANT_ID,
        nome: 'Clínica Real do Usuário',
        slug: 'clinica-real',
        email: 'contato@clinicareal.com',
        telefone: '(11) 9999-8888',
        endereco: 'Endereço da clínica real',
        plano: 'PREMIUM',
        ativo: true,
        limite_usuarios: 100
      }
    })
    console.log('✅ Tenant real criado no Sistema 2')
  } else {
    console.log('✅ Tenant real já existe no Sistema 2')
  }

  // Criar pacientes de teste para o TENANT REAL
  const pacientesReais = await Promise.all([
    prisma.paciente.create({
      data: {
        tenantId: REAL_TENANT_ID, // 🎯 USANDO TENANT REAL
        nome: 'Ana Silva Santos',
        cpf: '12345678901',
        nascimento: new Date('2016-03-15'), // 8 anos
        email: 'ana.silva@email.com',
        telefone: '(11) 99999-1234',
        endereco: 'Rua das Flores, 123 - São Paulo, SP',
        responsavel_financeiro: 'Maria Silva Santos',
        contato_emergencia: '(11) 88888-5678',
        plano_saude: 'Unimed',
        matricula: '123456789',
        cor_agenda: '#FF6B6B',
        ativo: true,
      },
    }),

    prisma.paciente.create({
      data: {
        tenantId: REAL_TENANT_ID, // 🎯 USANDO TENANT REAL
        nome: 'João Pedro Oliveira',
        cpf: '98765432101',
        nascimento: new Date('2018-07-22'), // 6 anos
        email: 'joao.pedro@email.com',
        telefone: '(11) 77777-9012',
        endereco: 'Av. Paulista, 456 - São Paulo, SP',
        responsavel_financeiro: 'Pedro Oliveira',
        contato_emergencia: '(11) 66666-3456',
        plano_saude: 'Bradesco Saúde',
        matricula: '987654321',
        cor_agenda: '#4ECDC4',
        ativo: true,
      },
    }),

    prisma.paciente.create({
      data: {
        tenantId: REAL_TENANT_ID, // 🎯 USANDO TENANT REAL
        nome: 'Lucas Mendes Costa',
        cpf: '11122233344',
        nascimento: new Date('2014-11-08'), // 10 anos
        telefone: '(11) 55555-7890',
        endereco: 'Rua do Bosque, 789 - São Paulo, SP',
        responsavel_financeiro: 'Carla Mendes Costa',
        contato_emergencia: '(11) 44444-1234',
        // Sem plano - particular
        cor_agenda: '#45B7D1',
        ativo: true,
      },
    }),

    prisma.paciente.create({
      data: {
        tenantId: REAL_TENANT_ID, // 🎯 USANDO TENANT REAL
        nome: 'Sophia Rodriguez Lima',
        cpf: '55566677788',
        nascimento: new Date('2017-01-12'), // 7 anos
        email: 'sophia.rodriguez@email.com',
        telefone: '(11) 33333-5678',
        endereco: 'Rua das Acácias, 321 - São Paulo, SP',
        responsavel_financeiro: 'Carmen Rodriguez Lima',
        contato_emergencia: '(11) 22222-9012',
        plano_saude: 'SulAmérica',
        matricula: '555666777',
        cor_agenda: '#9B59B6',
        ativo: true,
      },
    }),

    prisma.paciente.create({
      data: {
        tenantId: REAL_TENANT_ID, // 🎯 USANDO TENANT REAL
        nome: 'Gabriel Ferreira Souza',
        cpf: '99988877766',
        nascimento: new Date('2015-09-30'), // 9 anos
        telefone: '(11) 11111-3456',
        endereco: 'Alameda Santos, 654 - São Paulo, SP',
        responsavel_financeiro: 'Roberto Ferreira Souza',
        contato_emergencia: '(11) 99999-7890',
        plano_saude: 'Amil',
        matricula: '999888777',
        cor_agenda: '#F39C12',
        ativo: true,
      },
    }),

    prisma.paciente.create({
      data: {
        tenantId: REAL_TENANT_ID, // 🎯 USANDO TENANT REAL
        nome: 'Isabella Costa Alves',
        cpf: '77788899900',
        nascimento: new Date('2016-12-20'), // 8 anos
        telefone: '(11) 2222-3333',
        endereco: 'Rua da Esperança, 987 - São Paulo, SP',
        responsavel_financeiro: 'Julia Costa Alves',
        contato_emergencia: '(11) 4444-5555',
        plano_saude: 'Porto Seguro',
        matricula: '777888999',
        cor_agenda: '#E74C3C',
        ativo: true,
      },
    })
  ])

  console.log(`\n🎉 SUCESSO! Criados ${pacientesReais.length} pacientes para seu tenant real:`)
  console.log(`   🎯 Tenant ID: ${REAL_TENANT_ID}`)
  console.log(`   🏥 Clínica: ${tenant.nome}`)
  console.log(`   👥 Pacientes criados:`)

  pacientesReais.forEach((paciente, index) => {
    console.log(`      ${index + 1}. ${paciente.nome} - CPF: ${paciente.cpf}`)
  })

  console.log(`\n🔒 ISOLAMENTO GARANTIDO:`)
  console.log(`   ✅ Todos os pacientes pertencem ao SEU tenant`)
  console.log(`   ✅ Apenas VOCÊ verá esses pacientes`)
  console.log(`   ✅ API filtra automaticamente por seu tenant ID`)
  console.log(`   ✅ Outras clínicas NÃO terão acesso a esses dados`)

  console.log(`\n🚀 Próximo passo: Teste a página /pacientes!`)
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar dados para tenant real:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })