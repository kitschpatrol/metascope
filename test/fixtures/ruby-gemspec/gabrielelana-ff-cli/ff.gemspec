# Ensure we require the local version and not one we might have installed already
require File.join([File.dirname(__FILE__),'lib','ff','version.rb'])
spec = Gem::Specification.new do |s|
  s.name = 'ff-cli'
  s.version = FF::VERSION
  s.author = 'Gabriele Lana'
  s.email = 'gabriele.lana@gmail.com'
  s.homepage = 'https://github.com/gabrielelana/ff-cli'
  s.platform = Gem::Platform::RUBY
  s.summary = 'A command line tool to manage Firefox profiles'
  s.files = `git ls-files`.split("\n")
  s.require_paths << 'lib'
  s.has_rdoc = true
  s.extra_rdoc_files = ['README.rdoc','ff.rdoc']
  s.rdoc_options << '--title' << 'ff' << '--main' << 'README.rdoc' << '-ri'
  s.bindir = 'bin'
  s.executables << 'ff'
  s.add_development_dependency('rake')
  s.add_development_dependency('rdoc')
  s.add_development_dependency('rspec')
  s.add_development_dependency('aruba')
  s.add_runtime_dependency('gli','2.9.0')
  s.add_runtime_dependency('inifile','~> 2.0')
end
