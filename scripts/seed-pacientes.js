const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Criando dados de teste para pacientes...')

  // Limpar pacientes existentes
  await prisma.paciente.deleteMany()

  // Criar pacientes de exemplo
  const pacientes = await Promise.all([
    prisma.paciente.create({
      data: {
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
        nome: 'Lucas Mendes Costa',
        cpf: '11122233344',
        nascimento: new Date('2014-11-08'), // 10 anos
        telefone: '(11) 55555-7890',
        endereco: 'Rua do Bosque, 789 - São Paulo, SP',
        responsavel_financeiro: 'Carla Mendes Costa',
        contato_emergencia: '(11) 44444-1234',
        // Sem plano de saúde - particular
        cor_agenda: '#45B7D1',
        ativo: true,
      },
    }),

    prisma.paciente.create({
      data: {
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
  ])

  console.log(`✅ Criados ${pacientes.length} pacientes de teste:`)
  pacientes.forEach((paciente, index) => {
    console.log(`  ${index + 1}. ${paciente.nome} - ${paciente.cpf}`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar dados de teste:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })