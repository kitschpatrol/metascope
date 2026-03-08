
# frozen_string_literal: true

lib = File.expand_path('lib', __dir__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'sam/version'

Gem::Specification.new do |spec|
  spec.name          = 'sam-shepherd'
  spec.version       = Sam::VERSION
  spec.authors       = ['mereghost']
  spec.email         = ['marcello.rocha@gmail.com']

  spec.summary       = 'Sam watches over your unicorns so they are protected from Upstarts and Systemds'
  spec.description   = 'Sam intends to give you 0-downtime deployments when using unicorn / puma'
  spec.homepage      = 'https://github.com/vagas/sam'
  spec.license       = 'MIT'

  # Prevent pushing this gem to RubyGems.org. To allow pushes either set the 'allowed_push_host'
  # to allow pushing to a single host or delete this section to allow pushing to any host.
  # if spec.respond_to?(:metadata)
  #  spec.metadata['allowed_push_host'] = 'https://gemfury.org'
  # else
  #  raise 'RubyGems 2.0 or newer is required to protect against ' \
  #    'public gem pushes.'
  # end

  spec.files = `git ls-files -z`.split("\x0").reject do |f|
    f.match(%r{^(test|spec|features)/})
  end
  spec.bindir        = 'exe'
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ['lib']

  spec.add_dependency 'hanami-cli', '~> 0.2'
  spec.add_dependency 'tty-command', '~> 0.7'

  spec.add_development_dependency 'aruba'
  spec.add_development_dependency 'bundler'
  spec.add_development_dependency 'guard'
  spec.add_development_dependency 'guard-bundler'
  spec.add_development_dependency 'guard-rspec'
  spec.add_development_dependency 'guard-rubocop'
  spec.add_development_dependency 'puma'
  spec.add_development_dependency 'rake'
  spec.add_development_dependency 'rspec'
  spec.add_development_dependency 'rubocop'
  spec.add_development_dependency 'rubycritic'
  spec.add_development_dependency 'simplecov'
  spec.add_development_dependency 'sinatra'
  spec.add_development_dependency 'unicorn'
end
